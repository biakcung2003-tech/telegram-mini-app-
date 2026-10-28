import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import db from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function migrate() {
  const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');
  // node:sqlite exec() can run multiple statements at once.
  db.exec(schema);
  // Idempotent column additions for databases created before a column existed.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so we swallow the duplicate error.
  for (const stmt of ['ALTER TABLE ad_sessions ADD COLUMN opened_at TEXT']) {
    try {
      db.exec(stmt);
    } catch {
      /* column already exists — ignore */
    }
  }
  return true;
}

// Allow running directly: `npm run migrate`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate();
  console.log('✅ Database migrated.');
}
