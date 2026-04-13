const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/io?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date, start_date, end_date } = req.query;
  let query = `
    SELECT io.*, u.name as recorded_by_name FROM intake_output io
    LEFT JOIN users u ON io.recorded_by = u.id
    WHERE io.patient_id = ?
  `;
  const params = [req.params.pid];
  if (date) { query += ' AND io.record_date = ?'; params.push(date); }
  else if (start_date && end_date) {
    query += ' AND io.record_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  query += ' ORDER BY io.record_date DESC, io.record_time ASC';
  const records = db.prepare(query).all(...params);

  // Compute daily totals
  const totals = {};
  records.forEach(r => {
    if (!totals[r.record_date]) totals[r.record_date] = { intake: 0, output: 0 };
    if (r.type === 'intake') totals[r.record_date].intake += r.amount;
    else totals[r.record_date].output += r.amount;
  });

  res.json({ records, totals });
});

// POST /api/patients/:pid/io
router.post('/', (req, res) => {
  const { record_date, record_time, type, category, amount, unit, notes } = req.body;
  if (!record_date || !record_time || !type || !category || amount === undefined) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  const result = db.prepare(`
    INSERT INTO intake_output (patient_id, record_date, record_time, type, category, amount, unit, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.pid, record_date, record_time, type, category, amount, unit || 'mL', notes, req.user.id);
  res.json(db.prepare('SELECT * FROM intake_output WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/patients/:pid/io/:rid
router.put('/:rid', (req, res) => {
  const { record_date, record_time, type, category, amount, unit, notes } = req.body;
  db.prepare(`
    UPDATE intake_output SET record_date=?, record_time=?, type=?, category=?, amount=?, unit=?, notes=?
    WHERE id=? AND patient_id=?
  `).run(record_date, record_time, type, category, amount, unit, notes, req.params.rid, req.params.pid);
  res.json(db.prepare('SELECT * FROM intake_output WHERE id = ?').get(req.params.rid));
});

// DELETE /api/patients/:pid/io/:rid
router.delete('/:rid', (req, res) => {
  db.prepare('DELETE FROM intake_output WHERE id = ? AND patient_id = ?').run(req.params.rid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
