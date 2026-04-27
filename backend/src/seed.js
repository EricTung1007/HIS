const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('開始建立測試資料...');

// 建立使用者
const users = [
  { username: 'admin', password: 'admin123', name: '系統管理員', role: 'admin', department: '行政部' },
  { username: 'nurse1', password: 'nurse123', name: '王小明護理師', role: 'nurse', department: '護理部' },
  { username: 'nurse2', password: 'nurse123', name: '李淑芬護理師', role: 'nurse', department: '護理部' },
  { username: 'doctor1', password: 'doctor123', name: '張醫師', role: 'doctor', department: '醫療部' },
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, name, role, department) VALUES (?, ?, ?, ?, ?)');
users.forEach(u => insertUser.run(u.username, bcrypt.hashSync(u.password, 10), u.name, u.role, u.department));
console.log('✓ 使用者建立完成');

// 建立住民
const patients = [
  {
    patient_no: 'L001', name: '陳阿嬤', id_number: 'A123456789',
    birth_date: '1938-03-15', gender: 'F', blood_type: 'A',
    admission_date: '2023-01-10', room_no: '101', bed_no: 'A',
    care_level: '長照2級', nhi_no: 'H123456789',
    emergency_contact_name: '陳大明', emergency_contact_phone: '0912-345-678',
    emergency_contact_relation: '兒子', notes: '有跌倒病史，需特別注意'
  },
  {
    patient_no: 'L002', name: '林伯公', id_number: 'B234567890',
    birth_date: '1940-07-22', gender: 'M', blood_type: 'B',
    admission_date: '2023-02-15', room_no: '101', bed_no: 'B',
    care_level: '長照3級', nhi_no: 'H234567890',
    emergency_contact_name: '林小芳', emergency_contact_phone: '0923-456-789',
    emergency_contact_relation: '女兒', notes: '有糖尿病病史，需監測血糖'
  },
  {
    patient_no: 'L003', name: '黃老伯', id_number: 'C345678901',
    birth_date: '1935-11-08', gender: 'M', blood_type: 'O',
    admission_date: '2023-03-20', room_no: '102', bed_no: 'A',
    care_level: '長照4級', nhi_no: 'H345678901',
    emergency_contact_name: '黃阿忠', emergency_contact_phone: '0934-567-890',
    emergency_contact_relation: '兒子', notes: '中風後遺症，右側肢體無力'
  },
  {
    patient_no: 'L004', name: '王阿婆', id_number: 'D456789012',
    birth_date: '1942-05-30', gender: 'F', blood_type: 'AB',
    admission_date: '2023-04-05', room_no: '102', bed_no: 'B',
    care_level: '長照2級', nhi_no: 'H456789012',
    emergency_contact_name: '王志明', emergency_contact_phone: '0945-678-901',
    emergency_contact_relation: '兒子', notes: '失智症早期，需加強認知訓練'
  },
];

const insertPatient = db.prepare(`
  INSERT OR IGNORE INTO patients (patient_no, name, id_number, birth_date, gender, blood_type,
    admission_date, room_no, bed_no, care_level, nhi_no,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
patients.forEach(p => insertPatient.run(
  p.patient_no, p.name, p.id_number, p.birth_date, p.gender, p.blood_type,
  p.admission_date, p.room_no, p.bed_no, p.care_level, p.nhi_no,
  p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation, p.notes
));
console.log('✓ 住民資料建立完成');

// 取得 patient IDs
const p1 = db.prepare("SELECT id FROM patients WHERE patient_no = 'L001'").get();
const p2 = db.prepare("SELECT id FROM patients WHERE patient_no = 'L002'").get();
const p3 = db.prepare("SELECT id FROM patients WHERE patient_no = 'L003'").get();
const nurse1 = db.prepare("SELECT id FROM users WHERE username = 'nurse1'").get();
const doctor1 = db.prepare("SELECT id FROM users WHERE username = 'doctor1'").get();

if (p1 && p2 && p3) {
  // 病史
  db.prepare(`INSERT OR IGNORE INTO medical_history (patient_id, chief_complaint, present_illness, past_history, family_history, surgical_history, smoking, alcohol, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    p1.id,
    '下肢水腫、行動不便',
    '住民因下肢水腫及行動不便入住本機構，病程已三年，近期有加重趨勢。',
    '高血壓（20年）、骨質疏鬆、心臟病（10年）',
    '父親有高血壓病史，母親有糖尿病病史',
    '2005年膽囊切除術',
    '從不',
    '從不',
    nurse1 ? nurse1.id : 1
  );

  db.prepare(`INSERT OR IGNORE INTO medical_history (patient_id, chief_complaint, present_illness, past_history, family_history, surgical_history, smoking, alcohol, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    p2.id,
    '血糖控制不佳、日常生活需協助',
    '因糖尿病併發症及日常生活自理能力下降入住，目前需協助沐浴、如廁。',
    '第二型糖尿病（15年）、高血脂、膝關節退化',
    '兄長有糖尿病病史',
    '2010年右膝人工關節置換術',
    '已戒煙（戒煙20年）',
    '偶爾少量飲酒',
    nurse1 ? nurse1.id : 1
  );

  // 診斷
  const diagStmt = db.prepare(`INSERT INTO diagnoses (patient_id, icd_code, description, diagnosis_date, status, created_by) VALUES (?, ?, ?, ?, 'active', ?)`);
  diagStmt.run(p1.id, 'I10', '高血壓', '2023-01-10', doctor1 ? doctor1.id : 1);
  diagStmt.run(p1.id, 'I50.9', '心臟衰竭', '2023-01-10', doctor1 ? doctor1.id : 1);
  diagStmt.run(p1.id, 'M81.0', '骨質疏鬆症', '2023-01-10', doctor1 ? doctor1.id : 1);
  diagStmt.run(p2.id, 'E11.9', '第二型糖尿病', '2023-02-15', doctor1 ? doctor1.id : 1);
  diagStmt.run(p2.id, 'E78.5', '高血脂症', '2023-02-15', doctor1 ? doctor1.id : 1);
  diagStmt.run(p3.id, 'I63.9', '缺血性腦中風後遺症', '2023-03-20', doctor1 ? doctor1.id : 1);

  // 過敏
  db.prepare('INSERT INTO allergies (patient_id, allergen, reaction, severity) VALUES (?, ?, ?, ?)').run(p1.id, '盤尼西林 (Penicillin)', '皮疹、蕁麻疹', 'severe');
  db.prepare('INSERT INTO allergies (patient_id, allergen, reaction, severity) VALUES (?, ?, ?, ?)').run(p2.id, '磺胺類藥物', '皮膚過敏', 'moderate');

  console.log('✓ 病史、診斷、過敏資料建立完成');

  // 用藥醫囑
  const medStmt = db.prepare(`INSERT INTO medication_orders
    (patient_id, medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, indication, ordered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  medStmt.run(p1.id, 'Amlodipine (脈優)', 'Amlodipine', '5', 'mg', 'PO', 'QD', '08:00', '2023-01-10', '高血壓', doctor1 ? doctor1.id : 1);
  medStmt.run(p1.id, 'Furosemide (樂待), (速尿片)', 'Furosemide', '20', 'mg', 'PO', 'QD', '08:00', '2023-01-10', '心臟衰竭/水腫', doctor1 ? doctor1.id : 1);
  medStmt.run(p1.id, 'Calcium Carbonate (鈣片)', 'Calcium Carbonate', '500', 'mg', 'PO', 'BID', '08:00,20:00', '2023-01-10', '骨質疏鬆', doctor1 ? doctor1.id : 1);
  medStmt.run(p2.id, 'Metformin (庫魯化)', 'Metformin', '500', 'mg', 'PO', 'BID', '08:00,20:00', '2023-02-15', '第二型糖尿病', doctor1 ? doctor1.id : 1);
  medStmt.run(p2.id, 'Atorvastatin (立普妥)', 'Atorvastatin', '10', 'mg', 'PO', 'QD', '20:00', '2023-02-15', '高血脂', doctor1 ? doctor1.id : 1);
  medStmt.run(p3.id, 'Aspirin (阿斯匹靈)', 'Aspirin', '100', 'mg', 'PO', 'QD', '08:00', '2023-03-20', '腦中風預防', doctor1 ? doctor1.id : 1);

  console.log('✓ 用藥醫囑建立完成');

  // 出入量記錄
  const ioStmt = db.prepare(`INSERT INTO intake_output (patient_id, record_date, record_time, type, category, amount, unit, recorded_by) VALUES (?, ?, ?, ?, ?, ?, 'mL', ?)`);
  const today = new Date().toISOString().split('T')[0];
  ioStmt.run(p1.id, today, '08:00', 'intake', 'oral', 200, nurse1 ? nurse1.id : 1);
  ioStmt.run(p1.id, today, '10:00', 'intake', 'oral', 150, nurse1 ? nurse1.id : 1);
  ioStmt.run(p1.id, today, '12:00', 'intake', 'oral', 250, nurse1 ? nurse1.id : 1);
  ioStmt.run(p1.id, today, '09:00', 'output', 'urine', 300, nurse1 ? nurse1.id : 1);
  ioStmt.run(p1.id, today, '12:30', 'output', 'urine', 250, nurse1 ? nurse1.id : 1);

  console.log('✓ 出入量記錄建立完成');

  // 生命徵象
  const vsStmt = db.prepare(`INSERT INTO vital_signs (patient_id, measured_at, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature, spo2, weight, pain_score, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  vsStmt.run(p1.id, today + 'T08:00:00', 148, 88, 78, 18, 36.5, 97, 55.5, 2, nurse1 ? nurse1.id : 1);
  vsStmt.run(p1.id, today + 'T16:00:00', 152, 90, 80, 18, 36.6, 96, null, 1, nurse1 ? nurse1.id : 1);
  vsStmt.run(p2.id, today + 'T08:00:00', 138, 82, 72, 16, 36.8, 98, 72.0, 0, nurse1 ? nurse1.id : 1);
  vsStmt.run(p2.id, today + 'T08:00:00', null, null, null, null, null, null, null, null, nurse1 ? nurse1.id : 1);

  console.log('✓ 生命徵象記錄建立完成');

  // 護理記錄
  db.prepare(`INSERT INTO nursing_notes (patient_id, note_datetime, note_type, subjective, objective, assessment, plan, created_by)
    VALUES (?, ?, 'SOAP', ?, ?, ?, ?, ?)`).run(
    p1.id,
    today + 'T08:30:00',
    '住民主訴雙腳水腫比昨日嚴重，有些疲倦。',
    '雙側下肢水腫(2+)，膚色正常，無發紅破皮。血壓148/88，心率78次/分。',
    '體液蓄積相關之組織完整性受損風險，與心臟衰竭有關。',
    '1.按時給予Furosemide 2.監測出入量 3.抬高下肢 4.每日監測體重及水腫程度',
    nurse1 ? nurse1.id : 1
  );

  console.log('✓ 護理記錄建立完成');
}

console.log('\n測試資料建立完成！');
console.log('預設帳號：');
console.log('  管理員: admin / admin123');
console.log('  護理師: nurse1 / nurse123');
console.log('  醫師:   doctor1 / doctor123');
