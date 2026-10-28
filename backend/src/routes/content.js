import { Router } from 'express';
import db from '../db/index.js';
import { requireTelegramUser } from '../middleware/auth.js';
import { isUnlocked } from '../services/unlockService.js';
import { listActiveRewardedProviders } from '../ads/registry.js';
import { track } from '../lib/analytics.js';
import { getSetting, isMonetizationEnabled } from '../lib/settings.js';

const router = Router();
router.use(requireTelegramUser);

function publicContentRow(row, unlocked) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    categoryId: row.category_id,
    isLocked: row.is_locked === 1,
    unlocked,
    views: row.views,
  };
  // Only expose the body when unlocked (or content is not locked).
  if (unlocked || row.is_locked !== 1) {
    base.body = row.body;
  }
  return base;
}

/** GET /api/categories */
router.get('/categories', (req, res) => {
  const rows = db
    .prepare('SELECT id, slug, name FROM categories ORDER BY sort_order, name')
    .all();
  res.json({ categories: rows });
});

/** GET /api/content?category=&q= */
router.get('/content', (req, res) => {
  const { category, q } = req.query;
  const clauses = ['is_published = 1'];
  const params = [];
  if (category) {
    clauses.push('category_id = ?');
    params.push(Number(category));
  }
  if (q) {
    clauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const rows = db
    .prepare(
      `SELECT * FROM content WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`
    )
    .all(...params);

  const items = rows.map((r) => publicContentRow(r, isUnlocked(req.user.id, r.id)));
  res.json({ items });
});

/** GET /api/content/:id */
router.get('/content/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM content WHERE id = ? AND is_published = 1')
    .get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE content SET views = views + 1 WHERE id = ?').run(row.id);
  track('view', { userId: req.user.id, contentId: row.id });

  const unlocked = isUnlocked(req.user.id, row.id);
  const payload = publicContentRow({ ...row, views: row.views + 1 }, unlocked);

  // Attach unlock options when locked & monetization on.
  if (!unlocked && row.is_locked === 1) {
    const rule = row.unlock_rule_id
      ? db.prepare('SELECT * FROM unlock_rules WHERE id = ?').get(row.unlock_rule_id)
      : null;
    payload.unlock = {
      monetizationEnabled: isMonetizationEnabled(),
      requiredAds: rule?.required_ads ?? 1,
      durationSeconds: rule?.duration_seconds ?? 0,
      providers: listActiveRewardedProviders(),
    };
    // Sponsored SmartLink (optional, clearly labeled, never unlocks).
    const smartlink = getSetting('smartlink_url');
    if (smartlink) {
      payload.sponsored = {
        label: getSetting('smartlink_label') || 'Sponsored',
        url: smartlink,
      };
    }
  }

  res.json({ item: payload });
});

/** GET /api/me/unlocks — list the current user's unlocked content ids. */
router.get('/me/unlocks', (req, res) => {
  const rows = db
    .prepare('SELECT content_id, expires_at FROM unlocks WHERE user_id = ?')
    .all(req.user.id);
  res.json({
    unlocks: rows
      .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > Date.now())
      .map((r) => ({ contentId: r.content_id, expiresAt: r.expires_at })),
  });
});

/** POST /api/events/smartlink-click — analytics only; does NOT unlock. */
router.post('/events/smartlink-click', (req, res) => {
  const contentId = Number(req.body?.contentId) || null;
  track('smartlink_click', { userId: req.user.id, contentId });
  res.json({ ok: true });
});

export default router;
