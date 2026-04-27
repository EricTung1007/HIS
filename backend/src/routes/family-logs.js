const express = require('express');
const OpenAI = require('openai');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const aiRoute = require('./ai');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

function getClient(req) {
  const key = process.env.OPENAI_API_KEY ||
    req.headers['x-api-key'] ||
    (aiRoute.getRuntimeKey ? aiRoute.getRuntimeKey() : '');
  if (!key) return null;
  const baseURL = process.env.OPENAI_BASE_URL ||
    (aiRoute.getRuntimeBaseURL ? aiRoute.getRuntimeBaseURL() : undefined) || undefined;
  return new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) });
}

function getModel() {
  return process.env.OPENAI_MODEL ||
    (aiRoute.getRuntimeModel ? aiRoute.getRuntimeModel() : '') ||
    'gpt-4o';
}

// Collect today's data for a patient
function collectTodayData(pid, date) {
  const today = date || new Date().toISOString().split('T')[0];
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(pid);
  if (!patient) return null;

  const vitals = db.prepare(
    'SELECT * FROM vital_signs WHERE patient_id = ? AND DATE(measured_at) = ? ORDER BY measured_at'
  ).all(pid, today);

  const nursingNotes = db.prepare(
    "SELECT * FROM nursing_notes WHERE patient_id = ? AND DATE(note_datetime) = ? ORDER BY note_datetime"
  ).all(pid, today);

  const marToday = db.prepare(
    `SELECT ma.*, mo.medication_name, mo.dose, mo.unit, mo.route, mo.frequency
     FROM medication_administrations ma
     JOIN medication_orders mo ON ma.order_id = mo.id
     WHERE ma.patient_id = ? AND DATE(ma.administered_at) = ?
     ORDER BY ma.administered_at`
  ).all(pid, today);

  const activeMeds = db.prepare(
    "SELECT * FROM medication_orders WHERE patient_id = ? AND status = 'active'"
  ).all(pid);

  const io = db.prepare(
    "SELECT type, category, SUM(amount) as total, unit FROM intake_output WHERE patient_id = ? AND record_date = ? GROUP BY type, category"
  ).all(pid, today);

  const billing = db.prepare(
    `SELECT br.quantity, bc.name FROM billing_records br
     JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
     WHERE br.patient_id = ? AND br.service_date = ?`
  ).all(pid, today);

  return { patient, vitals, nursingNotes, marToday, activeMeds, io, billing, date: today };
}

// Build AI prompt for family summary
function buildFamilyPrompt(data) {
  const { patient, vitals, nursingNotes, marToday, activeMeds, io, billing, date } = data;
  const age = Math.floor((Date.now() - new Date(patient.birth_date)) / (365.25 * 24 * 3600 * 1000));

  const vitalsText = vitals.length === 0 ? '今日未測量' :
    vitals.map(v => {
      const parts = [];
      if (v.systolic_bp) parts.push(`血壓 ${v.systolic_bp}/${v.diastolic_bp}`);
      if (v.heart_rate) parts.push(`心跳 ${v.heart_rate}次/分`);
      if (v.temperature) parts.push(`體溫 ${v.temperature}°C`);
      if (v.spo2) parts.push(`血氧 ${v.spo2}%`);
      if (v.blood_glucose) parts.push(`血糖 ${v.blood_glucose}`);
      if (v.pain_score !== null && v.pain_score !== undefined) parts.push(`疼痛指數 ${v.pain_score}/10`);
      return parts.join('、');
    }).join('；');

  const notesText = nursingNotes.length === 0 ? '今日無護理記錄' :
    nursingNotes.map(n => n.content || `${n.subjective || ''} ${n.objective || ''} ${n.assessment || ''}`.trim()).filter(Boolean).join('；');

  const marText = marToday.length === 0 ? '今日無給藥記錄' :
    marToday.map(m => `${m.medication_name} ${m.dose}${m.unit}（${m.status === 'given' ? '已服用' : m.status === 'refused' ? '拒絕' : '暫停'}）`).join('、');

  const ioIntake = io.filter(r => r.type === 'intake').reduce((sum, r) => sum + r.total, 0);
  const ioOutput = io.filter(r => r.type === 'output').reduce((sum, r) => sum + r.total, 0);
  const ioText = ioIntake || ioOutput ? `攝入 ${ioIntake}mL、排出 ${ioOutput}mL` : '今日未記錄出入量';

  const servicesText = billing.length === 0 ? '今日無照護服務記錄' :
    billing.map(b => b.name).join('、');

  return `你是台灣長照機構的照護摘要撰寫助理。請根據以下今日照護資料，為住民家屬撰寫一份溫暖、易讀的「今日照護摘要」。

【住民資料】
姓名：${patient.name}，${age}歲
照護等級：${patient.care_level || '未知'}
警示事項：${patient.notes || '無'}

【${date} 照護資料】
生命徵象：${vitalsText}
用藥情況：${marText}
出入量：${ioText}
護理記錄：${notesText}
今日照護服務：${servicesText}

【寫作要求】
1. 用第三人稱稱呼住民（如「阿嬤」或住民的名字），語氣溫暖親切
2. 用家屬能理解的白話文（避免醫學術語，需解釋時加括號說明）
3. 包含以下段落：
   - 今日整體狀況（一段話概述）
   - 生命徵象（有資料才寫）
   - 飲食與水分（有資料才寫）
   - 用藥情況（有資料才寫）
   - 照護服務（有資料才寫）
   - 護理師觀察（有護理記錄才寫）
   - 溫馨提醒或建議（給家屬的一句話）
4. 若某項無資料，該段落可省略
5. 整體長度約 200-350 字
6. 不要加日期標題，直接開始內容
7. 只回傳摘要文字，不要任何格式符號或 JSON`;
}

// GET /api/patients/:pid/family-logs — list logs
router.get('/', (req, res) => {
  const { pid } = req.params;
  const { limit = 30 } = req.query;
  const rows = db.prepare(
    `SELECT fl.*, u.name as creator_name FROM family_contact_logs fl
     LEFT JOIN users u ON fl.created_by = u.id
     WHERE fl.patient_id = ? ORDER BY fl.log_date DESC LIMIT ?`
  ).all(pid, Number(limit));
  res.json(rows);
});

// GET /api/patients/:pid/family-logs/:id
router.get('/:id', (req, res) => {
  const { pid, id } = req.params;
  const row = db.prepare('SELECT * FROM family_contact_logs WHERE id = ? AND patient_id = ?').get(id, pid);
  if (!row) return res.status(404).json({ error: '找不到記錄' });
  res.json(row);
});

// POST /api/patients/:pid/family-logs — create or overwrite today's log
router.post('/', async (req, res) => {
  const { pid } = req.params;
  const { log_date, ai_summary, extra_notes, staff_notes, generate } = req.body;
  const date = log_date || new Date().toISOString().split('T')[0];

  let summary = ai_summary || '';

  // If generate=true, call AI to create summary
  if (generate) {
    const client = getClient(req);
    if (!client) return res.status(400).json({ error: '尚未設定 AI API Key，請至設定頁面輸入' });

    const data = collectTodayData(pid, date);
    if (!data) return res.status(404).json({ error: '住民不存在' });

    try {
      const completion = await client.chat.completions.create({
        model: getModel(),
        messages: [{ role: 'user', content: buildFamilyPrompt(data) }],
        max_tokens: 1000,
        temperature: 0.6,
      });
      summary = completion.choices[0].message.content || '';
    } catch (err) {
      return res.status(500).json({ error: `AI 生成失敗：${err.message}` });
    }
  }

  // Upsert (replace existing log for same date)
  const existing = db.prepare('SELECT id FROM family_contact_logs WHERE patient_id = ? AND log_date = ?').get(pid, date);
  let id;
  if (existing) {
    db.prepare(
      'UPDATE family_contact_logs SET ai_summary=?, extra_notes=?, staff_notes=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(summary || existing.ai_summary, extra_notes ?? null, staff_notes ?? null, req.user?.id || null, existing.id);
    id = existing.id;
  } else {
    const result = db.prepare(
      'INSERT INTO family_contact_logs (patient_id, log_date, ai_summary, extra_notes, staff_notes, created_by) VALUES (?,?,?,?,?,?)'
    ).run(pid, date, summary, extra_notes || null, staff_notes || null, req.user?.id || null);
    id = result.lastInsertRowid;
  }

  const row = db.prepare('SELECT * FROM family_contact_logs WHERE id = ?').get(id);
  res.json(row);
});

// PATCH /api/patients/:pid/family-logs/:id — update extra notes only
router.patch('/:id', (req, res) => {
  const { pid, id } = req.params;
  const { extra_notes, staff_notes } = req.body;
  const row = db.prepare('SELECT * FROM family_contact_logs WHERE id = ? AND patient_id = ?').get(id, pid);
  if (!row) return res.status(404).json({ error: '找不到記錄' });
  db.prepare(
    'UPDATE family_contact_logs SET extra_notes=?, staff_notes=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(extra_notes ?? row.extra_notes, staff_notes ?? row.staff_notes, req.user?.id || null, id);
  res.json(db.prepare('SELECT * FROM family_contact_logs WHERE id = ?').get(id));
});

// DELETE /api/patients/:pid/family-logs/:id
router.delete('/:id', (req, res) => {
  const { pid, id } = req.params;
  db.prepare('DELETE FROM family_contact_logs WHERE id = ? AND patient_id = ?').run(id, pid);
  res.json({ success: true });
});

module.exports = router;
