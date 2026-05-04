const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { autoBill } = require('../utils/auto-billing');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/vitals
router.get('/', (req, res) => {
  const { limit = 30 } = req.query;
  const records = db.prepare(`
    SELECT vs.*, u.name as recorded_by_name FROM vital_signs vs
    LEFT JOIN users u ON vs.recorded_by = u.id
    WHERE vs.patient_id = ?
    ORDER BY vs.measured_at DESC LIMIT ?
  `).all(req.params.pid, parseInt(limit));
  res.json(records);
});

// POST /api/patients/:pid/vitals
router.post('/', (req, res) => {
  const { measured_at, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
    temperature, spo2, weight, height, pain_score, blood_glucose, notes } = req.body;
  const time = measured_at || new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO vital_signs (patient_id, measured_at, systolic_bp, diastolic_bp, heart_rate,
      respiratory_rate, temperature, spo2, weight, height, pain_score, blood_glucose, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.pid, time, systolic_bp, diastolic_bp, heart_rate,
    respiratory_rate, temperature, spo2, weight, height, pain_score, blood_glucose, notes, req.user.id);
  res.json(db.prepare('SELECT * FROM vital_signs WHERE id = ?').get(result.lastInsertRowid));

  // Auto-billing hooks
  autoBill(req.params.pid, 'BA03', req.user.id, time, '系統自動核銷：測量生命徵象');
  if (blood_glucose) {
    autoBill(req.params.pid, 'BA17', req.user.id, time, '系統自動核銷：攜帶式血糖機驗血糖');
  }
});

// PUT /api/patients/:pid/vitals/:vid
router.put('/:vid', (req, res) => {
  const { measured_at, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
    temperature, spo2, weight, height, pain_score, blood_glucose, notes } = req.body;
  db.prepare(`
    UPDATE vital_signs SET measured_at=?, systolic_bp=?, diastolic_bp=?, heart_rate=?,
      respiratory_rate=?, temperature=?, spo2=?, weight=?, height=?, pain_score=?, blood_glucose=?, notes=?
    WHERE id=? AND patient_id=?
  `).run(measured_at, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
    temperature, spo2, weight, height, pain_score, blood_glucose, notes, req.params.vid, req.params.pid);
  res.json(db.prepare('SELECT * FROM vital_signs WHERE id = ?').get(req.params.vid));
});

// DELETE /api/patients/:pid/vitals/:vid
router.delete('/:vid', (req, res) => {
  db.prepare('DELETE FROM vital_signs WHERE id = ? AND patient_id = ?').run(req.params.vid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
