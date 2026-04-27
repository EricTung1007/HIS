const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/medications
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT mo.*, u.name as ordered_by_name FROM medication_orders mo LEFT JOIN users u ON mo.ordered_by = u.id WHERE mo.patient_id = ?';
  const params = [req.params.pid];
  if (status) { query += ' AND mo.status = ?'; params.push(status); }
  query += ' ORDER BY mo.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/patients/:pid/medications
router.post('/', (req, res) => {
  const { medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, end_date, indication, instructions } = req.body;
  if (!medication_name || !dose || !route || !frequency || !start_date) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  const result = db.prepare(`
    INSERT INTO medication_orders (patient_id, medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, end_date, indication, instructions, ordered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.pid, medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, end_date, indication, instructions, req.user.id);
  res.json(db.prepare('SELECT * FROM medication_orders WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/patients/:pid/medications/:mid
router.put('/:mid', (req, res) => {
  const { medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, end_date, indication, instructions, status } = req.body;
  db.prepare(`
    UPDATE medication_orders SET medication_name=?, generic_name=?, dose=?, unit=?, route=?,
      frequency=?, times_per_day=?, start_date=?, end_date=?, indication=?, instructions=?, status=?
    WHERE id=? AND patient_id=?
  `).run(medication_name, generic_name, dose, unit, route, frequency, times_per_day, start_date, end_date, indication, instructions, status, req.params.mid, req.params.pid);
  res.json(db.prepare('SELECT * FROM medication_orders WHERE id = ?').get(req.params.mid));
});

// DELETE /api/patients/:pid/medications/:mid (discontinue)
router.delete('/:mid', (req, res) => {
  db.prepare('UPDATE medication_orders SET status = ? WHERE id = ? AND patient_id = ?').run('discontinued', req.params.mid, req.params.pid);
  res.json({ success: true });
});

// GET /api/patients/:pid/medications/:mid/mar  — MAR records
router.get('/:mid/mar', (req, res) => {
  const records = db.prepare(`
    SELECT ma.*, u.name as administered_by_name FROM medication_administrations ma
    LEFT JOIN users u ON ma.administered_by = u.id
    WHERE ma.order_id = ? ORDER BY ma.administered_at DESC
  `).all(req.params.mid);
  res.json(records);
});

// POST /api/patients/:pid/mar — Record administration
router.post('/../mar', (req, res) => {
  // handled separately
});

module.exports = router;
