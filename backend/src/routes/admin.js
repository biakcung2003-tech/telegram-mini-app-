import { Router } from 'express';
import multer from 'multer';
import { extname, resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import db from '../db/index.js';
import config from '../config.js';
import { requireAdmin } from '../middleware/auth.js';
import { describeProviders, knownProviderKeys } from '../ads/registry.js';
import { getAllSettings, setSetting } from '../lib/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = config.uploadDir
  ? resolve(config.uploadDir)
  : resolve(__dirname, '../../uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const router = Router();
router.use(requireAdmin);

// ── Uploads ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname).toLowerCase()}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

/** POST /api/admin/upload — returns a public URL for the stored thumbnail. */
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `${config.publicBackendUrl}/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ── Categories ───────────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all() });
});

router.post('/categories', (req, res) => {
  const { slug, name, sortOrder } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: 'slug and name required' });
  const info = db
    .prepare('INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)')
    .run(String(slug), String(name), Number(sortOrder) || 0);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ── Content CRUD ─────────────────────────────────────────────
const contentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  body: z.string().max(20000).optional().default(''),
  thumbnailUrl: z.string().max(1000).optional().default(''),
  categoryId: z.number().int().nullable().optional(),
  isLocked: z.boolean().optional().default(true),
  isPublished: z.boolean().optional().default(true),
  unlockRuleId: z.number().int().nullable().optional(),
});

router.get('/content', (req, res) => {
  res.json({ items: db.prepare('SELECT * FROM content ORDER BY created_at DESC').all() });
});

router.post('/content', (req, res, next) => {
  try {
    const d = contentSchema.parse({
      ...req.body,
      categoryId: req.body?.categoryId != null ? Number(req.body.categoryId) : null,
      unlockRuleId: req.body?.unlockRuleId != null ? Number(req.body.unlockRuleId) : null,
    });
    const info = db
      .prepare(
        `INSERT INTO content
          (title, description, body, thumbnail_url, category_id, is_locked, is_published, unlock_rule_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        d.title, d.description, d.body, d.thumbnailUrl,
        d.categoryId, d.isLocked ? 1 : 0, d.isPublished ? 1 : 0, d.unlockRuleId
      );
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors });
    next(e);
  }
});

router.put('/content/:id', (req, res, next) => {
  try {
    const d = contentSchema.parse({
      ...req.body,
      categoryId: req.body?.categoryId != null ? Number(req.body.categoryId) : null,
      unlockRuleId: req.body?.unlockRuleId != null ? Number(req.body.unlockRuleId) : null,
    });
    db.prepare(
      `UPDATE content SET
         title=?, description=?, body=?, thumbnail_url=?, category_id=?,
         is_locked=?, is_published=?, unlock_rule_id=?, updated_at=datetime('now')
       WHERE id=?`
    ).run(
      d.title, d.description, d.body, d.thumbnailUrl, d.categoryId,
      d.isLocked ? 1 : 0, d.isPublished ? 1 : 0, d.unlockRuleId, Number(req.params.id)
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors });
    next(e);
  }
});

router.delete('/content/:id', (req, res) => {
  db.prepare('DELETE FROM content WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ── Unlock rules ─────────────────────────────────────────────
router.get('/unlock-rules', (req, res) => {
  res.json({ rules: db.prepare('SELECT * FROM unlock_rules ORDER BY id').all() });
});

router.post('/unlock-rules', (req, res) => {
  const { name, requiredAds, durationSeconds } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db
    .prepare('INSERT INTO unlock_rules (name, required_ads, duration_seconds) VALUES (?, ?, ?)')
    .run(String(name), Number(requiredAds) || 1, Number(durationSeconds) || 0);
  res.json({ id: info.lastInsertRowid });
});

router.put('/unlock-rules/:id', (req, res) => {
  const { name, requiredAds, durationSeconds } = req.body || {};
  db.prepare('UPDATE unlock_rules SET name=?, required_ads=?, duration_seconds=? WHERE id=?')
    .run(String(name), Number(requiredAds) || 1, Number(durationSeconds) || 0, Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/unlock-rules/:id', (req, res) => {
  db.prepare('DELETE FROM unlock_rules WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ── Ad providers ─────────────────────────────────────────────
router.get('/providers', (req, res) => {
  const configured = db.prepare('SELECT * FROM ad_providers ORDER BY id').all().map((r) => ({
    ...r,
    enabled: r.enabled === 1,
    rewarded: r.rewarded === 1,
    config: safeParse(r.config_json),
  }));
  res.json({ available: describeProviders(), configured });
});

router.post('/providers', (req, res) => {
  const { key, label, enabled, rewarded, config: cfg } = req.body || {};
  if (!key || !knownProviderKeys().includes(String(key))) {
    return res.status(400).json({ error: 'Unknown provider key' });
  }
  const json = JSON.stringify(cfg || {});
  db.prepare(
    `INSERT INTO ad_providers (key, label, enabled, rewarded, config_json, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       label=excluded.label, enabled=excluded.enabled, rewarded=excluded.rewarded,
       config_json=excluded.config_json, updated_at=datetime('now')`
  ).run(String(key), String(label || key), enabled ? 1 : 0, rewarded ? 1 : 0, json);
  res.json({ ok: true });
});

router.delete('/providers/:key', (req, res) => {
  db.prepare('DELETE FROM ad_providers WHERE key = ?').run(String(req.params.key));
  res.json({ ok: true });
});

// ── Settings (monetization toggle, smartlink) ────────────────
router.get('/settings', (req, res) => {
  res.json({ settings: getAllSettings() });
});

router.put('/settings', (req, res) => {
  const allowed = ['monetization_enabled', 'smartlink_url', 'smartlink_label'];
  const body = req.body || {};
  for (const key of allowed) {
    if (key in body) setSetting(key, body[key]);
  }
  res.json({ ok: true, settings: getAllSettings() });
});

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics', (req, res) => {
  const totals = {
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    content: db.prepare('SELECT COUNT(*) c FROM content').get().c,
    unlocks: db.prepare('SELECT COUNT(*) c FROM unlocks').get().c,
    views: db.prepare("SELECT COUNT(*) c FROM events WHERE type='view'").get().c,
    adVerified: db.prepare("SELECT COUNT(*) c FROM events WHERE type='ad_verified'").get().c,
    smartlinkClicks: db.prepare("SELECT COUNT(*) c FROM events WHERE type='smartlink_click'").get().c,
  };
  const byType = db
    .prepare("SELECT type, COUNT(*) c FROM events GROUP BY type ORDER BY c DESC")
    .all();
  const topContent = db
    .prepare('SELECT id, title, views, unlocks FROM content ORDER BY views DESC LIMIT 10')
    .all();
  const last7 = db
    .prepare(
      `SELECT date(created_at) d, COUNT(*) c FROM events
       WHERE created_at >= datetime('now','-7 days')
       GROUP BY date(created_at) ORDER BY d`
    )
    .all();
  res.json({ totals, byType, topContent, last7 });
});

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default router;
