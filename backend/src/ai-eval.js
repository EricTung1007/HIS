/**
 * AI EVALUATION SUITE - 50 ENTRIES
 * Covers all actions: vital_signs, intake, output, billing, mar, medication_order, nursing_note, update_patient, family_log.
 */

const { buildSystemPrompt, repairJson } = require('./ai-harness-logic');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const TEST_CASES = [
  // --- Vitals (1-10) ---
  { q: '血壓130/85', action: 'vital_signs', check: (d) => d.systolic_bp == 130 && d.diastolic_bp == 85 },
  { q: '體溫37.5度', action: 'vital_signs', check: (d) => d.temperature == 37.5 },
  { q: '心跳88次', action: 'vital_signs', check: (d) => d.heart_rate == 88 },
  { q: '血氧98%', action: 'vital_signs', check: (d) => d.spo2 == 98 },
  { q: '體重55公斤', action: 'vital_signs', check: (d) => d.weight == 55 },
  { q: '血糖 120', action: 'vital_signs', check: (d) => d.blood_glucose == 120 || d.glucose == 120 },
  { q: '阿嬤說背部疼痛 4 分', action: 'vital_signs', check: (d) => d.pain_score == 4 },
  { q: '呼吸 18 次', action: 'vital_signs', check: (d) => d.respiratory_rate == 18 },
  { q: '量測血壓120/80，心跳70', action: 'vital_signs', check: (d) => d.systolic_bp == 120 && d.heart_rate == 70 },
  { q: '發燒了 38.5度', action: 'vital_signs', check: (d) => d.temperature == 38.5 },

  // --- Intake (11-20) ---
  { q: '喝水200cc', action: 'intake', check: (d) => d.amount == 200 && (d.category === 'oral' || d.category === '口服') },
  { q: '管灌250cc', action: 'intake', check: (d) => d.amount == 250 && (d.category === 'tube_feeding' || d.category === '管灌') },
  { q: '點滴500cc', action: 'intake', check: (d) => d.amount == 500 && (d.category === 'iv' || d.category === '點滴' || d.category === '靜脈注射') },
  { q: '喝了一碗稀飯', action: 'intake', check: (d) => d.category === 'oral' || d.category === '口服' },
  { q: '補充牛奶 150ml', action: 'intake', check: (d) => d.amount == 150 },
  { q: '下午茶吃水果 100g', action: 'intake', check: (d) => d.category === 'oral' || d.category === '口服' },
  { q: '靜脈注射 100cc', action: 'intake', check: (d) => d.category === 'iv' || d.category === '靜脈注射' || d.category === '點滴' },
  { q: '點滴剩餘 100cc', action: 'intake', check: (d) => d.amount == 100 },
  { q: '管餵奶 180', action: 'intake', check: (d) => d.amount == 180 },
  { q: '喝湯 50cc', action: 'intake', check: (d) => d.amount == 50 },

  // --- Output (21-25) ---
  { q: '尿了300cc', action: 'output', check: (d) => d.amount == 300 && (d.category === 'urine' || d.category === '尿液') },
  { q: '大便一次', action: 'output', check: (d) => d.amount == 1 && (d.category === 'stool' || d.category === '糞便') },
  { q: '引流袋 150cc', action: 'output', check: (d) => d.amount == 150 },
  { q: '嘔吐 50cc', action: 'output', check: (d) => d.category === 'emesis' || d.category === 'other' || d.category === '嘔吐' },
  { q: '軟便二次', action: 'output', check: (d) => d.amount == 2 && (d.category === 'stool' || d.category === '糞便') },

  // --- Billing (26-35) ---
  { q: '幫住民洗澡', action: 'billing', check: (d) => d.code && d.code.includes('BA07') },
  { q: '翻身拍背', action: 'billing', check: (d) => d.code && d.code.includes('BA10') },
  { q: '協助進食', action: 'billing', check: (d) => d.code && d.code.includes('BA04') },
  { q: '修剪指甲', action: 'billing', check: (d) => d.code && d.code.includes('BA') },
  { q: '更換尿片', action: 'billing', check: (d) => d.code && d.code.includes('BA08') },
  { q: '傷口換藥', action: 'billing', check: (d) => d.code && d.code.includes('BA') },
  { q: '肢體關節活動', action: 'billing', check: (d) => d.code && d.code.includes('BA11') },
  { q: '陪同外出', action: 'billing', check: (d) => d.code && d.code.includes('BA') },
  { q: '協助沐浴洗頭', action: 'billing', check: (d) => d.code && d.code.includes('BA07') },
  { q: '口腔清潔', action: 'billing', check: (d) => d.code && d.code.includes('BA') },

  // --- Medication (36-40) ---
  { q: '已給Metformin', action: 'mar', check: (d) => d.status === 'given' },
  { q: '拒絕吃藥', action: 'mar', check: (d) => d.status === 'refused' },
  { q: '脈優已服用', action: 'mar', check: (d) => d.status === 'given' },
  { q: '加開 Aspirin 100mg 每天一次', action: 'medication_order', check: (d) => d.medication_name.toLowerCase().includes('aspirin') },
  { q: '醫師開了乙醯胺酚 500mg TID', action: 'medication_order', check: (d) => d.medication_name.includes('乙醯胺酚') },

  // --- Notes & Logs (41-50) ---
  { q: '心情穩定，沒有不舒服', action: 'nursing_note', check: (d) => d.content && d.content.length > 5 },
  { q: '換到202房', action: 'update_patient', check: (d) => d.room_no == '202' },
  { q: '阿公今天很有精神', action: 'family_log', check: (d) => d.extra_notes && d.extra_notes.length > 0 },
  { q: '住民反應頭暈', action: 'nursing_note', check: (d) => d.content && d.content.includes('頭暈') },
  { q: '編輯警告：對海鮮過敏', action: 'update_patient', check: (d) => d.notes && d.notes.includes('過敏') },
  { q: '聯絡簿備註：家屬周五來訪', action: 'family_log', check: (d) => d.staff_notes || d.extra_notes },
  { q: '傷口紅腫，已通知家屬', action: 'nursing_note', check: (d) => d.content && d.content.includes('傷口') },
  { q: '改床位到 B 床', action: 'update_patient', check: (d) => d.bed_no == 'B' },
  { q: '詢問目前體溫多少', action: 'query', check: (d) => d.answer || d.content },
  { q: '今天有沒有大便', action: 'query', check: (d) => d.answer || d.content }
];

const mockCtx = {
  patient: { name: '陳阿嬤', birth_date: '1945-01-01', gender: 'F', room_no: '101', bed_no: 'A' },
  meds: [{ medication_name: 'Metformin' }, { medication_name: 'Norvasc' }],
  ioToday: [{ type: 'intake', total: 200 }],
  billingCodes: [
    { code: 'BA07', name: '協助沐浴' },
    { code: 'BA10', name: '翻身拍背' },
    { code: 'BA04', name: '協助進食' },
    { code: 'BA05', name: '餐食照顧' },
    { code: 'BA08', name: '協助如廁' },
    { code: 'BA11', name: '肢體關節活動' }
  ]
};

async function runEvaluation(apiKey, baseURL, model) {
  const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
  console.log(`\nEvaluating Model: ${model}`);
  console.log(`Base URL: ${baseURL || 'Default OpenAI'}\n`);

  let passed = 0;
  const reportLines = [
    `# AI Evaluation Report`,
    `**Model:** \`${model}\``,
    `**Base URL:** \`${baseURL || 'Default OpenAI'}\``,
    `**Timestamp:** \`${new Date().toLocaleString()}\``,
    ``,
    `| # | Question | Expected Action | Actual Action | Output Data | Result |`,
    `|---|---|---|---|---|---|`
  ];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const test = TEST_CASES[i];
    process.stdout.write(`[${i+1}/50] Testing: "${test.q}" ... `);
    
    try {
      let rawText = '{}';
      if (model.toLowerCase().includes('qwen')) {
        const rawPrompt = `<|im_start|>system\n${buildSystemPrompt(mockCtx)}\n<|im_end|>\n<|im_start|>user\n使用者問題：\n${test.q}\n<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
        const completion = await client.completions.create({
          model: model,
          prompt: rawPrompt,
          max_tokens: 1024,
          temperature: 0.01,
        });
        rawText = completion.choices[0].text;
      } else {
        const completion = await client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: buildSystemPrompt(mockCtx) },
            { role: 'user', content: test.q }
          ],
          temperature: 0.01,
        });
        rawText = completion.choices[0].message.content;
      }

      const raw = rawText;
      const parsed = repairJson(raw);
      
      const actionMatch = parsed.action === test.action;
      const dataMatch = test.check(parsed.data || {});
      const isCorrect = actionMatch && dataMatch;
      const statusEmoji = isCorrect ? '✅ PASS' : '❌ FAIL';
      
      // Escape vertical bars and newlines for markdown table
      const safeData = JSON.stringify(parsed.data || {}).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      reportLines.push(`| ${i+1} | ${test.q} | ${test.action} | ${parsed.action} | \`${safeData}\` | ${statusEmoji} |`);

      if (isCorrect) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log('❌ FAIL');
        console.log(`   Expected Action: ${test.action}, Got: ${parsed.action}`);
        console.log(`   Data: ${JSON.stringify(parsed.data)}`);
      }
    } catch (e) {
      console.log('💥 ERROR');
      console.log(`   ${e.message}`);
      reportLines.push(`| ${i+1} | ${test.q} | ${test.action} | ERROR | \`${e.message.replace(/\|/g, '\\|')}\` | 💥 ERROR |`);
    }
  }

  console.log(`\n--- FINAL SCORE: ${passed}/50 ---`);
  
  // Write report
  reportLines.splice(4, 0, `**Final Score:** ${passed}/${TEST_CASES.length}`);
  const safeModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reportPath = path.join(__dirname, `..`, `benchmark_report_${safeModelName}.md`);
  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
  console.log(`Report saved to: ${reportPath}`);
}

const [,, key, url, model] = process.argv;
if (!key) {
  console.log('Usage: node backend/src/ai-eval.js <API_KEY> [BASE_URL] [MODEL]');
  process.exit(1);
}

runEvaluation(key, url, model || 'gpt-4o');
