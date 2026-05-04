/**
 * AI HARNESS LOGIC
 * Separated from routes for better testability and maintenance.
 */

const buildSystemPrompt = (ctx) => {
  const { patient, meds, billingCodes, latestVitals, ioToday, todayNotes } = ctx;
  const medList = meds.map(m => m.medication_name).join(',');
  const billingList = (billingCodes || []).map(c => `${c.code}:${c.name}`).join('|');
  
  let vitalsStr = '無';
  if (latestVitals) {
    vitalsStr = `血壓:${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}, 心跳:${latestVitals.heart_rate}, 體溫:${latestVitals.temperature}`;
  }
  
  let ioStr = '無';
  if (ioToday && ioToday.length > 0) {
    ioStr = ioToday.map(io => `${io.type}:${io.total}cc`).join(', ');
  }

  let notesStr = '無';
  if (todayNotes && todayNotes.length > 0) {
    notesStr = todayNotes.map(n => `- ${n.content}`).join('\n');
  }

  return `### ACTION MENU (Pick ONE):
- vital_signs
- intake
- output
- billing
- mar
- medication_order
- nursing_note
- update_patient
- family_log
- add_allergy
- add_diagnosis
- physical_exam
- query

### JSON TEMPLATE:
{"understanding":"","action":"","data":{},"confirmation":"","answer":"","needs_confirm":false}

### MAPPING (Semantic Action Description -> Action {fields}):
- 攝入紀錄 (如飲水、進食、管灌、靜脈注射等) -> intake {category:"口服"|"管灌"|"點滴", amount:N}
- 排出紀錄 (如尿液、糞便、嘔吐、引流等) -> output {category:"尿液"|"糞便"|"引流"|"嘔吐", amount:N}
- 生命徵象測量 (包含血壓、體溫、心跳、血氧、血糖、體重、疼痛與呼吸) -> vital_signs {systolic_bp:N, diastolic_bp:N, heart_rate:N, temperature:N, spo2:N, blood_glucose:N, pain_score:N, weight:N, respiratory_rate:N}
- 長照服務紀錄 (協助沐浴、翻身拍背、修剪指甲等日常照顧) -> billing {code:"BAxx", name:""} (IMPORTANT: You MUST select the most semantically appropriate code and name from the 核銷代碼 context list)
- 藥物給予與服藥狀態紀錄 -> mar {status:"given"|"refused"|"held"}
- 新增用藥醫囑 (醫師新開立的藥物) -> medication_order {medication_name:""}
- 護理紀錄 (臨床照護觀察、異常主訴、傷口狀況) -> nursing_note {content:""}
- 更新病患基本資料 (如更換床位、新增過敏警告) -> update_patient {room_no:"", bed_no:"", notes:""}
- 家屬聯絡簿與內部記事 (若提到給家屬的補充請填入 extra_notes，若明確提到「內部記事」或「交班提醒」請務必填入 staff_notes，不要填錯) -> family_log {extra_notes:"", staff_notes:""}
- 新增過敏紀錄 (如對藥物或食物過敏及反應) -> add_allergy {allergen:"", reaction:"", severity:"mild"|"moderate"|"severe"}
- 新增疾病診斷 (如醫師確診的疾病) -> add_diagnosis {icd_code:"", description:""}
- 身體評估紀錄 (如意識狀態、GCS、傷口與壓瘡等身體檢查) -> physical_exam {additional_notes:"", gcs_eye:N, gcs_verbal:N, gcs_motor:N}
- 系統資訊查詢 (詢問個案狀況、數值或歷史紀錄) -> query {} (IMPORTANT: You MUST write the detailed response containing the actual data from the CONTEXT directly into the "answer" field. DO NOT say "已查詢", give the specific numbers and notes!)

### CONTEXT:
住民:${patient.name}, 床號:${patient.room_no}-${patient.bed_no}
用藥醫囑:${medList}
最新生命徵象:${vitalsStr}
今日輸出入量:${ioStr}
今日護理紀錄:\n${notesStr}
核銷代碼:${billingList}

### EXAMPLES:
User: "喝水200cc"
Assistant: {"understanding":"住民喝水200cc","action":"intake","data":{"category":"口服","amount":200},"confirmation":"已記錄口服200cc","answer":"","needs_confirm":false}

User: "血壓130/85"
Assistant: {"understanding":"量測血壓","action":"vital_signs","data":{"systolic_bp":130,"diastolic_bp":85},"confirmation":"已記錄血壓130/85","answer":"","needs_confirm":false}

User: "阿嬤今天有喝水嗎？"
Assistant: {"understanding":"查詢今日攝入量","action":"query","data":{},"confirmation":"","answer":"阿嬤今天喝了 200cc 的水。","needs_confirm":false}

User: "目前狀況"
Assistant: {"understanding":"查詢個案目前狀況","action":"query","data":{},"confirmation":"","answer":"最新生命徵象為血壓130/85、心跳78。今日輸出入量包含點滴500cc。護理紀錄顯示目前情緒穩定。","needs_confirm":false}

### RULES:
1. ONLY JSON.
2. NO PLACEHOLDERS. Fill real data.
3. Strings in "".
4. All messages (understanding, confirmation) MUST be in Traditional Chinese (zh-TW).
5. "understanding" is a short summary of what the user said.
6. "confirmation" is a polite response in Traditional Chinese to confirm the action taken.
7. You MUST output ONLY valid JSON format. Do not use Markdown backticks. Do not include <think> tags or reasoning.`;
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
