const express = require('express');
const OpenAI = require('openai');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

let runtimeApiKey = '';
let runtimeBaseURL = '';
let runtimeModel = 'gpt-4o';

function getClient(req) {
  const key = process.env.OPENAI_API_KEY || req.headers['x-api-key'] || runtimeApiKey;
  if (!key) return null;
  const baseURL = process.env.OPENAI_BASE_URL || runtimeBaseURL || undefined;
  return new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) });
}

function getModel() {
  return process.env.OPENAI_MODEL || runtimeModel || 'gpt-4o';
}

function buildPatientContext(pid) {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(pid);
  if (!patient) return null;

  const meds = db.prepare(
    "SELECT medication_name, dose, unit, route, frequency, times_per_day FROM medication_orders WHERE patient_id = ? AND status = 'active'"
  ).all(pid);

  const latestVitals = db.prepare(
    'SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 1'
  ).get(pid);

  const today = new Date().toISOString().split('T')[0];
  const ioToday = db.prepare(
    "SELECT type, SUM(amount) as total FROM intake_output WHERE patient_id = ? AND record_date = ? GROUP BY type"
  ).all(pid, today);

  return { patient, meds, latestVitals, ioToday };
}

function buildSystemPrompt(ctx) {
  const { patient, meds, latestVitals, ioToday } = ctx;
  const age = Math.floor((Date.now() - new Date(patient.birth_date)) / (365.25 * 24 * 3600 * 1000));
  const ioSummary = ioToday.map(r => `${r.type === 'intake' ? '攝入' : '排出'}: ${r.total}mL`).join(', ') || '尚無記錄';
  const medList = meds.map(m =>
    `${m.medication_name} ${m.dose}${m.unit} ${m.route} ${m.frequency}${m.times_per_day ? ' (' + m.times_per_day + ')' : ''}`
  ).join('\n  ') || '無';

  return `你是台灣長照機構的AI護理助理，協助照護人員用自然語言記錄照護資料。

【目前住民】
姓名: ${patient.name}，${age}歲，${patient.gender === 'F' ? '女' : '男'}
房床: ${patient.room_no || '-'}房${patient.bed_no || '-'}床
照護等級: ${patient.care_level || '-'}

【目前有效用藥】
  ${medList}

【今日出入量】${ioSummary}

【最近一次生命徵象】${latestVitals
    ? `血壓${latestVitals.systolic_bp}/${latestVitals.diastolic_bp} 心跳${latestVitals.heart_rate} 體溫${latestVitals.temperature}°C 血氧${latestVitals.spo2}%`
    : '尚無記錄'}

---
你的任務：將照護人員說的自然語言轉換成結構化 JSON，執行以下其中一種動作：

動作類型與 data 格式：

1. vital_signs — 生命徵象
   data: { systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature, spo2, weight, pain_score, blood_glucose, notes }
   例："血壓148/88，心跳78，體溫36.5"

2. intake — 攝入量
   data: { category("oral"|"iv"|"tube_feeding"|"other"), amount(數字mL), notes }
   例："喝了200cc的水" / "管灌250cc"

3. output — 排出量
   data: { category("urine"|"stool"|"emesis"|"drain"|"other"), amount(數字), unit("mL"|"次"), notes }
   例："尿了300cc" / "大便一次"

4. mar — 給藥記錄
   data: { medication_name(盡量對應現有用藥), dose_given, status("given"|"refused"|"held"), notes }
   例："已給Metformin" / "脈優已服用" / "拒絕吃藥"

5. nursing_note — 護理記錄
   data: { note_type("SOAP"|"narrative"), subjective, objective, assessment, plan, content }
   例："住民情緒穩定，無不適主訴"

6. query — 查詢（不需記錄，只回答）
   data: { answer }

7. unknown — 無法辨識
   data: null

回傳嚴格 JSON（不要有其他文字）：
{
  "understanding": "你對指令的理解",
  "action": "動作類型",
  "data": { ... },
  "confirmation": "給照護人員看的確認訊息（繁體中文）",
  "needs_confirm": true或false
}

規則：
- 數量轉成數字（"兩百CC" → 200）
- 指令明確時 needs_confirm = false 可直接執行
- 涉及藥物或有疑義時 needs_confirm = true
- 用藥名稱盡量對應現有用藥列表
- 只回傳 JSON，不要任何說明文字`;
}

// GET /api/ai/status
router.get('/status', (req, res) => {
  const key = process.env.OPENAI_API_KEY || runtimeApiKey;
  res.json({
    configured: !!key,
    source: process.env.OPENAI_API_KEY ? 'env' : (runtimeApiKey ? 'runtime' : 'none'),
    base_url: process.env.OPENAI_BASE_URL || runtimeBaseURL || '',
    model: getModel(),
  });
});

// POST /api/ai/config
router.post('/config', (req, res) => {
  const { api_key, base_url, model } = req.body;
  if (!api_key) return res.status(400).json({ error: '請提供 API Key' });
  runtimeApiKey = api_key;
  if (base_url !== undefined) runtimeBaseURL = base_url;
  if (model) runtimeModel = model;
  res.json({ success: true, message: 'AI 設定已更新' });
});

// POST /api/patients/:pid/ai/chat
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  const { pid } = req.params;
  if (!message) return res.status(400).json({ error: '請輸入指令' });

  const client = getClient(req);
  if (!client) return res.status(400).json({ error: '尚未設定 OpenAI API Key，請至設定頁面輸入' });

  const ctx = buildPatientContext(pid);
  if (!ctx) return res.status(404).json({ error: '住民不存在' });

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(ctx) },
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    });

    const rawText = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(rawText);

    // Match medication name to order_id
    if (parsed.action === 'mar' && parsed.data?.medication_name) {
      const medName = parsed.data.medication_name.toLowerCase();
      const orders = db.prepare(
        "SELECT id, medication_name FROM medication_orders WHERE patient_id = ? AND status = 'active'"
      ).all(pid);
      const matched = orders.find(o =>
        o.medication_name.toLowerCase().includes(medName) ||
        medName.includes(o.medication_name.toLowerCase().split(' ')[0])
      );
      if (matched) parsed.data.order_id = matched.id;
    }

    res.json(parsed);
  } catch (err) {
    console.error('OpenAI error:', err.message);
    const msg = err.status === 401 ? 'API Key 無效，請重新設定' :
                err.status === 429 ? '請求過於頻繁，請稍後再試' :
                `AI 處理失敗: ${err.message}`;
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
