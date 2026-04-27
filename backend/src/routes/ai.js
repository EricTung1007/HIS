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

  // Load common billing codes for AI matching (AA/BA/BB/BC/BD/GA categories)
  const billingCodes = db.prepare(
    `SELECT code, name, price FROM ltc_billing_codes
     WHERE category IN ('AA','BA','BB','BC','BD','GA')
     ORDER BY code LIMIT 60`
  ).all();

  return { patient, meds, latestVitals, ioToday, billingCodes };
}

const { buildSystemPrompt, repairJson } = require('../ai-harness-logic');

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
  if (!api_key && !base_url) return res.status(400).json({ error: '請提供 API Key 或本地端點' });
  
  runtimeApiKey = api_key || 'local-dummy-key';
  if (base_url !== undefined) runtimeBaseURL = base_url;
  if (model) runtimeModel = model;
  
  res.json({ success: true, message: 'AI 設定已更新' });
});

// POST /api/patients/:pid/ai/chat
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  const { pid } = req.params;
  if (!message) return res.status(400).json({ error: '請輸入指令' });

  const client = getClient(req);
  if (!client) return res.status(400).json({ error: '尚未設定 OpenAI API Key' });

  const ctx = buildPatientContext(pid);
  if (!ctx) return res.status(404).json({ error: '住民不存在' });

  const historyMessages = [];
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    for (const turn of recent) {
      historyMessages.push({ role: turn.role, content: typeof turn.content === 'string' ? turn.content : JSON.stringify(turn.content) });
    }
  }

  try {
    const model = getModel();
    const isReasoningModel = model.startsWith('o1-') || model.startsWith('o3-');

    const baseParams = {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      temperature: isReasoningModel ? 1 : 0.01,
    };

    let completion;
    const tryRequest = async (params) => {
      try {
        return await client.chat.completions.create(params);
      } catch (e) {
        if (e.status === 400) {
          const msg = e.message.toLowerCase();
          if (params.max_completion_tokens && (msg.includes('max_completion_tokens') || msg.includes('unknown parameter'))) {
            const nextParams = { ...params };
            delete nextParams.max_completion_tokens;
            nextParams.max_tokens = 1024;
            return tryRequest(nextParams);
          }
          if (params.response_format?.type === 'json_object' && (msg.includes('response_format') || msg.includes('json_object'))) {
            const nextParams = { ...params };
            delete nextParams.response_format;
            return tryRequest(nextParams);
          }
        }
        throw e;
      }
    };

    completion = await tryRequest({
      ...baseParams,
      response_format: isReasoningModel ? undefined : { type: 'json_object' },
      max_completion_tokens: 1024,
    });

    const rawText = completion.choices[0].message.content || '{}';
    let parsed;
    try {
      parsed = repairJson(rawText);
    } catch (e) {
      console.error('Failed to repair AI response:', rawText);
      throw new Error('AI 回傳格式錯誤，請重試');
    }

    if (parsed.action === 'mar' && parsed.data?.medication_name) {
      const medName = parsed.data.medication_name.toLowerCase();
      const orders = db.prepare("SELECT id, medication_name FROM medication_orders WHERE patient_id = ? AND status = 'active'").all(pid);
      const matched = orders.find(o => o.medication_name.toLowerCase().includes(medName) || medName.includes(o.medication_name.toLowerCase().split(' ')[0]));
      if (matched) parsed.data.order_id = matched.id;
    }

    res.json(parsed);
  } catch (err) {
    console.error('OpenAI error:', err.message);
    const msg = err.status === 401 ? 'API Key 或本地端點連線失敗' :
                err.status === 429 ? '請求過於頻繁' :
                `AI 處理失敗: ${err.message}`;
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
module.exports.getRuntimeKey = () => runtimeApiKey;
module.exports.getRuntimeBaseURL = () => runtimeBaseURL;
module.exports.getRuntimeModel = () => runtimeModel;
