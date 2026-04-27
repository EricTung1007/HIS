const { repairJson, buildSystemPrompt } = require('./ai-harness-logic');

const mockCtx = {
  patient: { name: '陳阿嬤', birth_date: '1945-01-01', gender: 'F', room_no: '101', bed_no: 'A' },
  meds: [{ medication_name: 'Metformin' }],
  ioToday: [],
  billingCodes: [{ code: 'BA07', name: '協助沐浴' }]
};

function runTests() {
  console.log('--- AI Harness Unit Tests ---');

  // Test 1: Prompt Generation
  const prompt = buildSystemPrompt(mockCtx);
  if (!prompt.includes('陳阿嬤') || !prompt.includes('BA07')) {
    console.error('FAIL: Prompt missing context data');
  } else {
    console.log('PASS: Prompt generation includes context');
  }

  // Test 2: JSON Repair - Unquoted Alphanumeric
  const broken1 = '{"bed_no": 101-A, "status": given}';
  const repaired1 = repairJson(broken1);
  if (repaired1.bed_no === '101-A' && repaired1.status === 'given') {
    console.log('PASS: JSON repair (unquoted alphanumeric)');
  } else {
    console.error('FAIL: JSON repair failed unquoted alphanumeric', repaired1);
  }

  // Test 3: JSON Repair - Markdown Wrapper
  const broken2 = '```json\n{"action": "test"}\n```';
  const repaired2 = repairJson(broken2);
  if (repaired2.action === 'test') {
    console.log('PASS: JSON repair (markdown wrapper)');
  } else {
    console.error('FAIL: JSON repair failed markdown wrapper');
  }

  // Test 4: JSON Repair - Misplaced root fields
  const broken3 = '{"data": {"action": "vital_signs", "understanding": "test"}}';
  const repaired3 = repairJson(broken3);
  if (repaired3.action === 'vital_signs' && repaired3.understanding === 'test') {
    console.log('PASS: JSON repair (flattening nested root fields)');
  } else {
    console.error('FAIL: JSON repair failed flattening', repaired3);
  }

  console.log('--- Tests Completed ---');
}

runTests();
