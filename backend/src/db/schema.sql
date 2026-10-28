-- ────────────────────────────────────────────────────────────
-- Users (Telegram identities)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,            -- Telegram user id
  username        TEXT,
  first_name      TEXT,
  last_name       TEXT,
  photo_url       TEXT,
  language_code   TEXT,
  is_premium      INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Admin accounts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Categories
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Content
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  body          TEXT DEFAULT '',          -- the unlocked payload (text / url / html)
  thumbnail_url TEXT DEFAULT '',
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_locked     INTEGER NOT NULL DEFAULT 1,
  is_published  INTEGER NOT NULL DEFAULT 1,
  -- which unlock rule applies; references unlock_rules(id)
  unlock_rule_id INTEGER REFERENCES unlock_rules(id) ON DELETE SET NULL,
  views         INTEGER NOT NULL DEFAULT 0,
  unlocks       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_published ON content(is_published);

-- ────────────────────────────────────────────────────────────
-- Unlock rules (how a user may unlock a piece of content)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unlock_rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  -- required number of verified rewarded-ad completions to unlock
  required_ads    INTEGER NOT NULL DEFAULT 1,
  -- unlock duration in seconds; 0 = permanent
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Ad providers (configured in admin panel)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_providers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT UNIQUE NOT NULL,     -- matches a provider module key
  label         TEXT NOT NULL,
  enabled       INTEGER NOT NULL DEFAULT 0,
  rewarded      INTEGER NOT NULL DEFAULT 0, -- 1 = may be used to unlock content
  -- JSON string of provider-specific config (keys, zone ids, s2s secret...)
  config_json   TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Ad sessions: the lifecycle of a single rewarded-ad attempt.
-- Prevents replay: each session is single-use and must be verified.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_sessions (
  id            TEXT PRIMARY KEY,         -- opaque session id (nanoid)
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id    INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  provider_key  TEXT NOT NULL,
  nonce         TEXT NOT NULL,            -- server-issued, echoed by callback
  status        TEXT NOT NULL DEFAULT 'pending', -- pending|verified|consumed|failed|expired
  reward_amount INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at     TEXT,                     -- when the user actually opened the ad/link
  verified_at   TEXT,
  consumed_at   TEXT,
  expires_at    TEXT NOT NULL,
  ip            TEXT,
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_user ON ad_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_status ON ad_sessions(status);

-- ────────────────────────────────────────────────────────────
-- Nonce ledger — hard guarantee against replayed callbacks.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS used_nonces (
  nonce       TEXT PRIMARY KEY,
  used_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Unlocked permissions (server-side source of truth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unlocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id  INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,                       -- NULL = permanent
  source      TEXT NOT NULL DEFAULT 'ad', -- ad|admin
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_unlocks_user ON unlocks(user_id);

-- ────────────────────────────────────────────────────────────
-- Settings (key/value) — monetization toggle, smartlink, etc.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────
-- Analytics events
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,              -- view|unlock_start|ad_verified|unlock|smartlink_click
  user_id     INTEGER,
  content_id  INTEGER,
  meta_json   TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
