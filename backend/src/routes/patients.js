const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/patients
router.get('/', (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM patients WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  else { query += ' AND status = ?'; params.push('active'); }
  if (search) {
    query += ' AND (name LIKE ? OR patient_no LIKE ? OR room_no LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY room_no, bed_no';
  res.json(db.prepare(query).all(...params));
});

// POST /api/patients
router.post('/', (req, res) => {
  const {
    patient_no, name, id_number, birth_date, gender, blood_type,
    admission_date, room_no, bed_no, care_level, nhi_no,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation, notes
  } = req.body;
  if (!patient_no || !name || !birth_date || !gender || !admission_date) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO patients (patient_no, name, id_number, birth_date, gender, blood_type,
        admission_date, room_no, bed_no, care_level, nhi_no,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient_no, name, id_number, birth_date, gender, blood_type,
      admission_date, room_no, bed_no, care_level, nhi_no,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation, notes);
    res.json(db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: '住民編號已存在' });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/patients/:id
router.get('/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: '找不到住民資料' });
  res.json(patient);
});

// PATCH /api/patients/:id
router.patch('/:id', (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ error: '無更新資料' });

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  values.push(req.params.id);

  try {
    db.prepare(`UPDATE patients SET ${setClause} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE patients SET status = ? WHERE id = ?').run('discharged', req.params.id);
  res.json({ success: true });
});

module.exports = router;
