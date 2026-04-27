const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

const PE_FIELDS = [
  'exam_date','consciousness','gcs_eye','gcs_verbal','gcs_motor','general_appearance',
  'head','eyes','ears','nose','throat','neck','lymph_nodes',
  'chest_inspection','breath_sounds','respiratory_pattern',
  'heart_sounds','peripheral_pulses','edema',
  'abdomen_inspection','bowel_sounds','abdomen_palpation',
  'muscle_strength','range_of_motion','mobility',
  'skin_color','skin_integrity','wounds','pressure_injuries',
  'orientation','memory','speech','urinary','bowel_pattern',
  'morse_fall_history','morse_secondary_diagnosis','morse_ambulatory_aid',
  'morse_iv','morse_gait','morse_mental_status',
  'braden_sensory','braden_moisture','braden_activity',
  'braden_mobility','braden_nutrition','braden_friction',
  'additional_notes'
];

// GET /api/patients/:pid/pe
router.get('/', (req, res) => {
  const records = db.prepare(`
    SELECT pe.*, u.name as examiner_name FROM physical_exams pe
    LEFT JOIN users u ON pe.examiner = u.id
    WHERE pe.patient_id = ? ORDER BY pe.exam_date DESC
  `).all(req.params.pid);
  res.json(records);
});

// GET /api/patients/:pid/pe/:eid
router.get('/:eid', (req, res) => {
  const record = db.prepare(`
    SELECT pe.*, u.name as examiner_name FROM physical_exams pe
    LEFT JOIN users u ON pe.examiner = u.id
    WHERE pe.id = ? AND pe.patient_id = ?
  `).get(req.params.eid, req.params.pid);
  if (!record) return res.status(404).json({ error: '找不到評估記錄' });
  res.json(record);
});

// POST /api/patients/:pid/pe
router.post('/', (req, res) => {
  if (!req.body.exam_date) return res.status(400).json({ error: '評估日期為必填' });
  const vals = PE_FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null);
  const placeholders = PE_FIELDS.map(() => '?').join(',');
  const cols = PE_FIELDS.join(',');
  const result = db.prepare(`
    INSERT INTO physical_exams (patient_id, ${cols}, examiner)
    VALUES (?, ${placeholders}, ?)
  `).run(req.params.pid, ...vals, req.user.id);
  res.json(db.prepare('SELECT * FROM physical_exams WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/patients/:pid/pe/:eid
router.put('/:eid', (req, res) => {
  const sets = PE_FIELDS.map(f => `${f}=?`).join(',');
  const vals = PE_FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE physical_exams SET ${sets} WHERE id=? AND patient_id=?`)
    .run(...vals, req.params.eid, req.params.pid);
  res.json(db.prepare('SELECT * FROM physical_exams WHERE id = ?').get(req.params.eid));
});

// DELETE /api/patients/:pid/pe/:eid
router.delete('/:eid', (req, res) => {
  db.prepare('DELETE FROM physical_exams WHERE id = ? AND patient_id = ?').run(req.params.eid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
