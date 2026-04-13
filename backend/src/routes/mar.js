const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/mar?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date } = req.query;
  let orderQuery = `
    SELECT mo.*, u.name as ordered_by_name
    FROM medication_orders mo
    LEFT JOIN users u ON mo.ordered_by = u.id
    WHERE mo.patient_id = ? AND mo.status = 'active'
    ORDER BY mo.medication_name
  `;
  const orders = db.prepare(orderQuery).all(req.params.pid);

  const result = orders.map(order => {
    let marQuery = `
      SELECT ma.*, u.name as administered_by_name
      FROM medication_administrations ma
      LEFT JOIN users u ON ma.administered_by = u.id
      WHERE ma.order_id = ?
    `;
    const marParams = [order.id];
    if (date) {
      marQuery += ' AND DATE(ma.administered_at) = ?';
      marParams.push(date);
    }
    marQuery += ' ORDER BY ma.administered_at DESC';
    const administrations = db.prepare(marQuery).all(...marParams);
    return { ...order, administrations };
  });
  res.json(result);
});

// POST /api/patients/:pid/mar — Give medication
router.post('/', (req, res) => {
  const { order_id, scheduled_time, administered_at, dose_given, status, notes } = req.body;
  if (!order_id) return res.status(400).json({ error: '缺少醫囑編號' });
  const adminTime = administered_at || new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO medication_administrations (order_id, patient_id, scheduled_time, administered_at, dose_given, status, notes, administered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order_id, req.params.pid, scheduled_time, adminTime, dose_given, status || 'given', notes, req.user.id);
  const record = db.prepare(`
    SELECT ma.*, u.name as administered_by_name FROM medication_administrations ma
    LEFT JOIN users u ON ma.administered_by = u.id
    WHERE ma.id = ?
  `).get(result.lastInsertRowid);
  res.json(record);
});

// PUT /api/patients/:pid/mar/:rid
router.put('/:rid', (req, res) => {
  const { status, notes, dose_given, administered_at } = req.body;
  db.prepare(`
    UPDATE medication_administrations SET status=?, notes=?, dose_given=?, administered_at=?
    WHERE id=? AND patient_id=?
  `).run(status, notes, dose_given, administered_at, req.params.rid, req.params.pid);
  res.json(db.prepare('SELECT * FROM medication_administrations WHERE id = ?').get(req.params.rid));
});

// DELETE /api/patients/:pid/mar/:rid
router.delete('/:rid', (req, res) => {
  db.prepare('DELETE FROM medication_administrations WHERE id = ? AND patient_id = ?').run(req.params.rid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
