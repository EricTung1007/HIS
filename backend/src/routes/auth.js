const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '請輸入帳號和密碼' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: '帳號或密碼錯誤' });

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, department: user.department } });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, department FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '使用者不存在' });
  res.json(user);
});

// POST /api/auth/register (admin only or first run)
router.post('/register', (req, res) => {
  const { username, password, name, role, department } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, name, role, department) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hash, name, role || 'nurse', department || '');
    res.json({ id: result.lastInsertRowid, username, name, role: role || 'nurse' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: '帳號已存在' });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/users
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, department FROM users ORDER BY name').all();
  res.json(users);
});

module.exports = router;
