import db from '../db/index.js';

export function track(type, { userId = null, contentId = null, meta = {} } = {}) {
  db.prepare(
    `INSERT INTO events (type, user_id, content_id, meta_json)
     VALUES (?, ?, ?, ?)`
  ).run(type, userId, contentId, JSON.stringify(meta || {}));
}
