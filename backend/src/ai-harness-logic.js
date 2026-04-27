/**
 * AI HARNESS LOGIC
 * Separated from routes for better testability and maintenance.
 */

const buildSystemPrompt = (ctx) => {
  const { patient, meds, billingCodes } = ctx;
  const medList = meds.map(m => m.medication_name).join(',');
  const billingList = (billingCodes || []).map(c => `${c.code}:${c.name}`).join('|');

  return `### ACTION MENU (Pick ONE):
- vital_signs
- intake
- output
- billing
- mar
- medication_order
- nursing_note
- update_patient

### JSON TEMPLATE:
{"understanding":"","action":"","data":{},"confirmation":"","needs_confirm":false}

### MAPPING (Key -> Action {fields}):
- "水/飲料/牛奶/管灌" -> intake {category:"口服"|"管灌", amount:N}
- "尿液/糞便/引流" -> output {category:"尿液"|"糞便"|"引流", amount:N}
- "血壓/體溫/心跳/血氧/血糖/疼痛" -> vital_signs {systolic_bp:N, diastolic_bp:N, heart_rate:N, temperature:N, spo2:N, blood_glucose:N, pain_score:N, weight:N}
- "洗澡/翻身/拍背/協助" -> billing {code:"BAxx", name:""}

### CONTEXT:
住民:${patient.name}, 床號:${patient.room_no}-${patient.bed_no}
用藥醫囑:${medList}
核銷代碼:${billingList}

### RULES:
1. ONLY JSON.
2. NO PLACEHOLDERS. Fill real data.
3. Strings in "".
4. All messages (understanding, confirmation) MUST be in Traditional Chinese (zh-TW).
5. "understanding" is a short summary of what the user said.
6. "confirmation" is a polite response in Traditional Chinese to confirm the action taken.`;
};

const repairJson = (raw) => {
  let cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  cleaned = cleaned.replace(/:\s*([a-zA-Z0-9][a-zA-Z0-9\-_]*)(?=[,\s}])/g, ': "$1"');
  
  try {
    const parsed = JSON.parse(cleaned);
    
    // Recovery: Nesting
    if (!parsed.action && parsed.data?.action) {
      const { action, understanding, confirmation, needs_confirm, ...rest } = parsed.data;
      Object.assign(parsed, { action, understanding, confirmation, needs_confirm, data: rest.data || rest });
    }
    if (parsed.action && parsed.data?.[parsed.action]) {
      parsed.data = parsed.data[parsed.action];
    }

    // Normalization
    if (parsed.action) parsed.action = parsed.action.toLowerCase().trim();
    if (parsed.data?.category) parsed.data.category = parsed.data.category.toLowerCase().trim();
    if (parsed.data?.status) parsed.data.status = parsed.data.status.toLowerCase().trim();

    return parsed;
  } catch (e) {
    throw e;
  }
};

module.exports = {
  buildSystemPrompt,
  repairJson
};
