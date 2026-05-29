import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, all, run } from '../db.js';
import { generateToken, authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

  const user = get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
  });
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, requireAdmin, async (req, res) => {
  const { username, password, display_name, role } = req.body;
  if (!username || !password || !display_name) return res.status(400).json({ error: '请填写完整信息' });

  const existing = get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)', [username, hash, display_name, role || 'user']);
  res.json({ message: '用户创建成功' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = get('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const users = all('SELECT id, username, display_name, role, created_at FROM users ORDER BY id');
  res.json(users);
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { username, display_name, password, role } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.id === 1 && req.user.id !== 1) return res.status(403).json({ error: '不能修改初始管理员' });

  if (username && username !== user.username) {
    const dup = get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id]);
    if (dup) return res.status(409).json({ error: '用户名已存在' });
  }

  const newUsername = username || user.username;
  const newDisplay = display_name || user.display_name;
  const newRole = role || user.role;

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    run('UPDATE users SET username = ?, password_hash = ?, display_name = ?, role = ? WHERE id = ?',
      [newUsername, hash, newDisplay, newRole, req.params.id]);
  } else {
    run('UPDATE users SET username = ?, display_name = ?, role = ? WHERE id = ?',
      [newUsername, newDisplay, newRole, req.params.id]);
  }
  res.json({ message: '修改成功' });
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.id === 1) return res.status(403).json({ error: '不能删除初始管理员' });
  if (user.id === req.user.id) return res.status(403).json({ error: '不能删除自己' });
  run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: '删除成功' });
});

export default router;
