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
- "Water/Drink/Milk/Tube" -> intake {category:"oral"|"tube_feeding", amount:N}
- "Urine/Stool/Drain" -> output {category:"urine"|"stool"|"drain", amount:N}
- "BP/Temp/HR/O2/BS/Pain" -> vital_signs {systolic_bp:N, diastolic_bp:N, heart_rate:N, temperature:N, spo2:N, blood_glucose:N, pain_score:N, weight:N}
- "Bathing/Turning/Assist" -> billing {code:"BAxx", name:""}

### CONTEXT:
Patient:${patient.name}, Bed:${patient.room_no}-${patient.bed_no}
Meds:${medList}
BillingCodes:${billingList}

### RULES:
1. ONLY JSON.
2. NO PLACEHOLDERS. Fill real data.
3. Strings in "".`;
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
