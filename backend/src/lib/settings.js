import db from '../db/index.js';

const DEFAULTS = {
  monetization_enabled: 'true',
  smartlink_url: '',
  smartlink_label: 'Sponsored',
};

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row) return row.value;
  return DEFAULTS[key] ?? null;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, String(value));
}

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function isMonetizationEnabled() {
  return getSetting('monetization_enabled') === 'true';
}
