const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/billing-codes — list all billing codes (supports ?q= search)
router.get('/codes', (req, res) => {
  const { q, category } = req.query;
  let sql = 'SELECT * FROM ltc_billing_codes';
  const params = [];
  const conditions = [];

  if (q) {
    conditions.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY code';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/billing-codes/:code — single billing code
router.get('/codes/:code', (req, res) => {
  const row = db.prepare('SELECT * FROM ltc_billing_codes WHERE code = ?').get(req.params.code);
  if (!row) return res.status(404).json({ error: '找不到此核銷碼' });
  res.json(row);
});

// GET /api/patients/:pid/billing — list billing records for a patient
router.get('/records', (req, res) => {
  const { pid } = req.params;
  const { start_date, end_date, month } = req.query;
  let sql = `SELECT br.*, bc.code, bc.name as code_name, bc.category,
             u.name as recorder_name
             FROM billing_records br
             JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
             LEFT JOIN users u ON br.recorded_by = u.id
             WHERE br.patient_id = ?`;
  const params = [pid];

  if (month) {
    // month format: YYYY-MM
    sql += ' AND br.service_date LIKE ?';
    params.push(`${month}%`);
  } else {
    if (start_date) { sql += ' AND br.service_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND br.service_date <= ?'; params.push(end_date); }
  }

  sql += ' ORDER BY br.service_date DESC, br.service_time DESC';
  const rows = db.prepare(sql).all(...params);

  // Calculate totals
  const total = rows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0);

  res.json({ records: rows, total, count: rows.length });
});

// POST /api/patients/:pid/billing — create billing record
router.post('/records', (req, res) => {
  const { pid } = req.params;
  const { billing_code_id, code, service_date, service_time, quantity, is_remote, notes } = req.body;

  // Resolve billing_code_id from code string if needed
  let codeRow;
  if (billing_code_id) {
    codeRow = db.prepare('SELECT * FROM ltc_billing_codes WHERE id = ?').get(billing_code_id);
  } else if (code) {
    codeRow = db.prepare('SELECT * FROM ltc_billing_codes WHERE code = ?').get(code);
  }
  if (!codeRow) return res.status(400).json({ error: '無效的核銷碼' });

  const unitPrice = is_remote && codeRow.remote_price ? codeRow.remote_price : codeRow.price;
  const date = service_date || new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = service_time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const qty = quantity || 1;

  const result = db.prepare(
    `INSERT INTO billing_records (patient_id, billing_code_id, service_date, service_time, quantity, unit_price, is_remote, notes, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(pid, codeRow.id, date, time, qty, unitPrice, is_remote ? 1 : 0, notes || '', req.user?.id || null);

  res.json({
    id: result.lastInsertRowid,
    code: codeRow.code,
    name: codeRow.name,
    unit_price: unitPrice,
    quantity: qty,
    subtotal: unitPrice * qty,
    service_date: date,
    service_time: time,
  });
});

// DELETE /api/patients/:pid/billing/:id
router.delete('/records/:id', (req, res) => {
  const { pid, id } = req.params;
  const row = db.prepare('SELECT * FROM billing_records WHERE id = ? AND patient_id = ?').get(id, pid);
  if (!row) return res.status(404).json({ error: '找不到此記錄' });
  db.prepare('DELETE FROM billing_records WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/patients/:pid/billing/export — export CSV for a patient
router.get('/export', (req, res) => {
  const { pid } = req.params;
  const { start_date, end_date, month } = req.query;

  let sql = `SELECT br.service_date, br.service_time, bc.code, bc.name as code_name,
             br.quantity, br.unit_price, (br.quantity * br.unit_price) as subtotal,
             br.is_remote, br.notes, u.name as recorder_name
             FROM billing_records br
             JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
             LEFT JOIN users u ON br.recorded_by = u.id
             WHERE br.patient_id = ?`;
  const params = [pid];

  if (month) {
    sql += ' AND br.service_date LIKE ?';
    params.push(`${month}%`);
  } else {
    if (start_date) { sql += ' AND br.service_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND br.service_date <= ?'; params.push(end_date); }
  }
  sql += ' ORDER BY br.service_date, br.service_time';

  const rows = db.prepare(sql).all(...params);

  // Get patient name
  const patient = db.prepare('SELECT name, patient_no FROM patients WHERE id = ?').get(pid);
  const patientLabel = patient ? `${patient.name}(${patient.patient_no})` : pid;

  // BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const header = '服務日期,服務時間,核銷碼,照顧組合,數量,單價,小計,離島價,備註,記錄者\n';
  const body = rows.map(r =>
    `${r.service_date},${r.service_time || ''},${r.code},"${r.code_name}",${r.quantity},${r.unit_price},${r.subtotal},${r.is_remote ? '是' : '否'},"${(r.notes || '').replace(/"/g, '""')}","${r.recorder_name || ''}"`
  ).join('\n');

  const total = rows.reduce((sum, r) => sum + r.subtotal, 0);
  const footer = `\n,,,,,,${total},,,合計`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="billing_${patientLabel}_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(BOM + header + body + footer);
});

// GET /api/billing/export-all — export all patients billing CSV
router.get('/export-all', (req, res) => {
  const { start_date, end_date, month } = req.query;

  let sql = `SELECT p.patient_no, p.name as patient_name, br.service_date, br.service_time,
             bc.code, bc.name as code_name, br.quantity, br.unit_price,
             (br.quantity * br.unit_price) as subtotal, br.is_remote, br.notes, u.name as recorder_name
             FROM billing_records br
             JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
             JOIN patients p ON br.patient_id = p.id
             LEFT JOIN users u ON br.recorded_by = u.id
             WHERE 1=1`;
  const params = [];

  if (month) {
    sql += ' AND br.service_date LIKE ?';
    params.push(`${month}%`);
  } else {
    if (start_date) { sql += ' AND br.service_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND br.service_date <= ?'; params.push(end_date); }
  }
  sql += ' ORDER BY p.patient_no, br.service_date, br.service_time';

  const rows = db.prepare(sql).all(...params);

  const BOM = '\uFEFF';
  const header = '住民編號,住民姓名,服務日期,服務時間,核銷碼,照顧組合,數量,單價,小計,離島價,備註,記錄者\n';
  const body = rows.map(r =>
    `${r.patient_no},"${r.patient_name}",${r.service_date},${r.service_time || ''},${r.code},"${r.code_name}",${r.quantity},${r.unit_price},${r.subtotal},${r.is_remote ? '是' : '否'},"${(r.notes || '').replace(/"/g, '""')}","${r.recorder_name || ''}"`
  ).join('\n');

  const total = rows.reduce((sum, r) => sum + r.subtotal, 0);
  const footer = `\n,,,,,,,,,${total},,合計`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="billing_all_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(BOM + header + body + footer);
});

// GET /api/billing/summary — summary stats for dashboard
router.get('/summary', (req, res) => {
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);

  // Per-patient totals
  const patientTotals = db.prepare(`
    SELECT p.id, p.patient_no, p.name, p.care_level,
           COUNT(br.id) as record_count,
           SUM(br.quantity * br.unit_price) as total_amount
    FROM patients p
    LEFT JOIN billing_records br ON p.id = br.patient_id AND br.service_date LIKE ?
    WHERE p.status = 'active'
    GROUP BY p.id
    ORDER BY total_amount DESC
  `).all(`${m}%`);

  // Per-code totals
  const codeTotals = db.prepare(`
    SELECT bc.code, bc.name, bc.category,
           SUM(br.quantity) as total_quantity,
           SUM(br.quantity * br.unit_price) as total_amount
    FROM billing_records br
    JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
    WHERE br.service_date LIKE ?
    GROUP BY bc.code
    ORDER BY total_amount DESC
  `).all(`${m}%`);

  const grandTotal = patientTotals.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  res.json({ month: m, patientTotals, codeTotals, grandTotal });
});

module.exports = router;
