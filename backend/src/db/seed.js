import { pathToFileURL } from 'node:url';
import db from './index.js';
import config from '../config.js';
import { migrate } from './migrate.js';
import { hashPassword } from '../lib/crypto.js';

/** Ensure schema + a bootstrap admin + a couple of starter rows exist. */
export function bootstrap() {
  migrate();

  // Bootstrap admin from env (idempotent).
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(config.auth.adminUsername);
  if (!existing) {
    const { hash, salt } = hashPassword(config.auth.adminPassword);
    db.prepare('INSERT INTO admins (username, password_hash, password_salt) VALUES (?, ?, ?)')
      .run(config.auth.adminUsername, hash, salt);
    console.log(`[seed] admin "${config.auth.adminUsername}" created`);
  }

  // Default unlock rule.
  const ruleCount = db.prepare('SELECT COUNT(*) c FROM unlock_rules').get().c;
  if (ruleCount === 0) {
    db.prepare('INSERT INTO unlock_rules (name, required_ads, duration_seconds) VALUES (?, ?, ?)')
      .run('Watch 1 ad (permanent)', 1, 0);
  }

  // Auto-configure the SmartLink gate provider from env, but ONLY if an admin
  // hasn't already configured it (don't clobber panel edits).
  const smartlinkUrl = config.adsterra.smartlinkUrl;
  if (smartlinkUrl) {
    const existingSL = db.prepare("SELECT id FROM ad_providers WHERE key = 'smartlink'").get();
    if (!existingSL) {
      db.prepare(
        `INSERT INTO ad_providers (key, label, enabled, rewarded, config_json, updated_at)
         VALUES ('smartlink', 'Adsterra SmartLink', 1, 1, ?, datetime('now'))`
      ).run(JSON.stringify({ url: smartlinkUrl, label: 'Sponsored', cooldownSeconds: 15 }));
      console.log('[seed] smartlink provider configured from env');
    }
  }
}

/** Optional demo content — run with `npm run seed`. */
function seedDemo() {
  bootstrap();

  const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
  if (catCount === 0) {
    const cats = [
      ['guides', 'Guides', 1],
      ['tools', 'Tools', 2],
      ['premium', 'Premium', 3],
    ];
    const insCat = db.prepare('INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)');
    cats.forEach((c) => insCat.run(...c));
  }

  const contentCount = db.prepare('SELECT COUNT(*) c FROM content').get().c;
  if (contentCount === 0) {
    const rule = db.prepare('SELECT id FROM unlock_rules ORDER BY id LIMIT 1').get();
    const premium = db.prepare("SELECT id FROM categories WHERE slug='premium'").get();
    const guides = db.prepare("SELECT id FROM categories WHERE slug='guides'").get();
    const ins = db.prepare(
      `INSERT INTO content (title, description, body, thumbnail_url, category_id, is_locked, unlock_rule_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    ins.run('Getting Started (free)', 'A free intro guide.', 'Welcome! This content is free to read.', '', guides?.id, 0, null);
    ins.run('Premium Cheat Sheet', 'Unlock with a rewarded ad.', 'Here is your premium content payload. 🎉', '', premium?.id, 1, rule?.id);
    ins.run('Advanced Tricks', 'Locked premium content.', 'Secret advanced tricks revealed.', '', premium?.id, 1, rule?.id);
    console.log('[seed] demo content inserted');
  }
  console.log('✅ Seed complete.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemo();
}
