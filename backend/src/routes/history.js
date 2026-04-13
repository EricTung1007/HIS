const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/history
router.get('/', (req, res) => {
  const history = db.prepare('SELECT * FROM medical_history WHERE patient_id = ? ORDER BY created_at DESC').get(req.params.pid);
  const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE patient_id = ? ORDER BY diagnosis_date DESC').all(req.params.pid);
  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ? ORDER BY allergen').all(req.params.pid);
  res.json({ history: history || null, diagnoses, allergies });
});

// PUT /api/patients/:pid/history
router.put('/', (req, res) => {
  const { chief_complaint, present_illness, past_history, family_history, surgical_history, social_history, smoking, alcohol } = req.body;
  const existing = db.prepare('SELECT id FROM medical_history WHERE patient_id = ?').get(req.params.pid);
  if (existing) {
    db.prepare(`
      UPDATE medical_history SET chief_complaint=?, present_illness=?, past_history=?,
        family_history=?, surgical_history=?, social_history=?, smoking=?, alcohol=?,
        updated_at=CURRENT_TIMESTAMP, created_by=?
      WHERE patient_id=?
    `).run(chief_complaint, present_illness, past_history, family_history, surgical_history, social_history, smoking, alcohol, req.user.id, req.params.pid);
  } else {
    db.prepare(`
      INSERT INTO medical_history (patient_id, chief_complaint, present_illness, past_history,
        family_history, surgical_history, social_history, smoking, alcohol, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.pid, chief_complaint, present_illness, past_history, family_history, surgical_history, social_history, smoking, alcohol, req.user.id);
  }
  res.json(db.prepare('SELECT * FROM medical_history WHERE patient_id = ?').get(req.params.pid));
});

// POST /api/patients/:pid/diagnoses
router.post('/diagnoses', (req, res) => {
  const { icd_code, description, diagnosis_date, status, notes } = req.body;
  if (!description) return res.status(400).json({ error: '診斷描述為必填' });
  const result = db.prepare(
    'INSERT INTO diagnoses (patient_id, icd_code, description, diagnosis_date, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.pid, icd_code, description, diagnosis_date, status || 'active', notes, req.user.id);
  res.json(db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/patients/:pid/diagnoses/:did
router.put('/diagnoses/:did', (req, res) => {
  const { icd_code, description, diagnosis_date, status, notes } = req.body;
  db.prepare(
    'UPDATE diagnoses SET icd_code=?, description=?, diagnosis_date=?, status=?, notes=? WHERE id=? AND patient_id=?'
  ).run(icd_code, description, diagnosis_date, status, notes, req.params.did, req.params.pid);
  res.json(db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(req.params.did));
});

// DELETE /api/patients/:pid/diagnoses/:did
router.delete('/diagnoses/:did', (req, res) => {
  db.prepare('DELETE FROM diagnoses WHERE id = ? AND patient_id = ?').run(req.params.did, req.params.pid);
  res.json({ success: true });
});

// POST /api/patients/:pid/allergies
router.post('/allergies', (req, res) => {
  const { allergen, reaction, severity } = req.body;
  if (!allergen) return res.status(400).json({ error: '過敏原為必填' });
  const result = db.prepare(
    'INSERT INTO allergies (patient_id, allergen, reaction, severity) VALUES (?, ?, ?, ?)'
  ).run(req.params.pid, allergen, reaction, severity || 'mild');
  res.json(db.prepare('SELECT * FROM allergies WHERE id = ?').get(result.lastInsertRowid));
});

// DELETE /api/patients/:pid/allergies/:aid
router.delete('/allergies/:aid', (req, res) => {
  db.prepare('DELETE FROM allergies WHERE id = ? AND patient_id = ?').run(req.params.aid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
