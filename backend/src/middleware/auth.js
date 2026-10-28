import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config from '../config.js';
import { verifyInitData } from '../lib/telegramAuth.js';

/**
 * Telegram Mini App user auth.
 * Accepts initData via `Authorization: tma <initData>` header (preferred) or
 * `X-Telegram-Init-Data` header. Verifies server-side, upserts the user, and
 * attaches req.user = { id, ... }.
 */
export function requireTelegramUser(req, res, next) {
  try {
    let initData = null;
    const authz = req.get('authorization') || '';
    if (authz.toLowerCase().startsWith('tma ')) {
      initData = authz.slice(4).trim();
    }
    if (!initData) initData = req.get('x-telegram-init-data') || null;
    if (!initData) {
      return res.status(401).json({ error: 'Missing Telegram initData' });
    }

    const { user } = verifyInitData(initData);

    db.prepare(
      `INSERT INTO users (id, username, first_name, last_name, photo_url, language_code, is_premium, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         photo_url = excluded.photo_url,
         language_code = excluded.language_code,
         is_premium = excluded.is_premium,
         last_seen_at = datetime('now')`
    ).run(
      user.id,
      user.username || null,
      user.first_name || null,
      user.last_name || null,
      user.photo_url || null,
      user.language_code || null,
      user.is_premium ? 1 : 0
    );

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid Telegram initData', detail: e.message });
  }
}

/** Admin JWT auth via httpOnly cookie or Bearer token. */
export function requireAdmin(req, res, next) {
  try {
    const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const token = req.cookies?.admin_token || bearer;
    if (!token) return res.status(401).json({ error: 'Admin auth required' });
    const payload = jwt.verify(token, config.auth.jwtSecret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.admin = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin session' });
  }
}
