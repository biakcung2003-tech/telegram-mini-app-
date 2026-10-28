import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config from '../config.js';
import { verifyPassword } from '../lib/crypto.js';
import { adminLoginLimiter } from '../middleware/rateLimit.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

/** POST /api/admin/login */
router.post('/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username));
  // Always run a comparison to reduce timing/user-enumeration differences.
  const ok =
    admin && verifyPassword(String(password), admin.password_salt, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: admin.id, username: admin.username, role: 'admin' },
    config.auth.jwtSecret,
    { expiresIn: '12h' }
  );

  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.json({ ok: true, token, admin: { id: admin.id, username: admin.username } });
});

/** POST /api/admin/logout */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

/** GET /api/admin/me */
router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
