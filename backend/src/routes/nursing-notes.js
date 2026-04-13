const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/patients/:pid/notes
router.get('/', (req, res) => {
  const { limit = 50, offset = 0, date } = req.query;
  let query = `
    SELECT nn.*, u.name as created_by_name FROM nursing_notes nn
    LEFT JOIN users u ON nn.created_by = u.id
    WHERE nn.patient_id = ?
  `;
  const params = [req.params.pid];
  if (date) { query += ' AND DATE(nn.note_datetime) = ?'; params.push(date); }
  query += ' ORDER BY nn.note_datetime DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(db.prepare(query).all(...params));
});

// POST /api/patients/:pid/notes
router.post('/', (req, res) => {
  const { note_datetime, note_type, subjective, objective, assessment, plan, content } = req.body;
  const time = note_datetime || new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO nursing_notes (patient_id, note_datetime, note_type, subjective, objective, assessment, plan, content, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.pid, time, note_type || 'SOAP', subjective, objective, assessment, plan, content, req.user.id);
  const note = db.prepare(`
    SELECT nn.*, u.name as created_by_name FROM nursing_notes nn
    LEFT JOIN users u ON nn.created_by = u.id WHERE nn.id = ?
  `).get(result.lastInsertRowid);
  res.json(note);
});

// PUT /api/patients/:pid/notes/:nid
router.put('/:nid', (req, res) => {
  const { note_datetime, note_type, subjective, objective, assessment, plan, content } = req.body;
  db.prepare(`
    UPDATE nursing_notes SET note_datetime=?, note_type=?, subjective=?, objective=?,
      assessment=?, plan=?, content=?
    WHERE id=? AND patient_id=?
  `).run(note_datetime, note_type, subjective, objective, assessment, plan, content, req.params.nid, req.params.pid);
  res.json(db.prepare('SELECT * FROM nursing_notes WHERE id = ?').get(req.params.nid));
});

// DELETE /api/patients/:pid/notes/:nid
router.delete('/:nid', (req, res) => {
  db.prepare('DELETE FROM nursing_notes WHERE id = ? AND patient_id = ?').run(req.params.nid, req.params.pid);
  res.json({ success: true });
});

module.exports = router;
