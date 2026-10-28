import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Uses Node's built-in SQLite (node:sqlite, available in Node 22.5+ / 24).
 * This avoids native compilation (no Visual Studio / node-gyp needed on
 * Windows). We wrap DatabaseSync in a thin shim that exposes the small subset
 * of the better-sqlite3 API this project relies on: prepare().{get,all,run},
 * exec(), pragma(), and transaction().
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
// DATA_DIR can be overridden in production (e.g. a Render persistent disk at
// /var/data) so the SQLite file survives redeploys.
const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(__dirname, '../../data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = resolve(DATA_DIR, 'app.sqlite');

const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL;');
raw.exec('PRAGMA foreign_keys = ON;');

const db = {
  _raw: raw,

  /** better-sqlite3-style prepare(). Returns an object with get/all/run. */
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
      run: (...args) => {
        const info = stmt.run(...args);
        return {
          changes: Number(info.changes),
          lastInsertRowid: info.lastInsertRowid,
        };
      },
    };
  },

  exec(sql) {
    raw.exec(sql);
  },

  pragma(expr) {
    raw.exec(`PRAGMA ${expr};`);
  },

  /**
   * Minimal transaction helper compatible with how this codebase calls it:
   *   const tx = db.transaction(() => { ...stmts... });
   *   tx();
   * Rolls back on throw and rethrows the error.
   */
  transaction(fn) {
    return (...args) => {
      raw.exec('BEGIN');
      try {
        const result = fn(...args);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        try {
          raw.exec('ROLLBACK');
        } catch {
          /* ignore rollback failure */
        }
        throw e;
      }
    };
  },
};

export default db;
