import { nanoid } from 'nanoid';
import db from '../db/index.js';
import { getProvider } from '../ads/registry.js';
import { randomHex } from '../lib/crypto.js';
import { signGrant, verifyGrant } from '../lib/grants.js';
import { track } from '../lib/analytics.js';
import { isMonetizationEnabled } from '../lib/settings.js';

const AD_SESSION_TTL_SECONDS = 15 * 60; // 15 minutes to complete an ad

function nowIso() {
  return new Date().toISOString();
}
function plusSeconds(sec) {
  return new Date(Date.now() + sec * 1000).toISOString();
}

/** Is a piece of content currently unlocked for a user (respecting expiry)? */
export function isUnlocked(userId, contentId) {
  const row = db
    .prepare('SELECT expires_at FROM unlocks WHERE user_id = ? AND content_id = ?')
    .get(userId, contentId);
  if (!row) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    // Expired — clean up and treat as locked.
    db.prepare('DELETE FROM unlocks WHERE user_id = ? AND content_id = ?').run(
      userId,
      contentId
    );
    return false;
  }
  return true;
}

/**
 * Step 1: user consents to watch a rewarded ad. We create a single-use ad
 * session with a server-issued nonce and return the client config for the
 * chosen provider.
 */
export function startAdSession({ userId, contentId, providerKey, ip, userAgent }) {
  if (!isMonetizationEnabled()) {
    const err = new Error('Monetization is currently disabled');
    err.status = 403;
    throw err;
  }

  const content = db
    .prepare('SELECT * FROM content WHERE id = ? AND is_published = 1')
    .get(contentId);
  if (!content) {
    const err = new Error('Content not found');
    err.status = 404;
    throw err;
  }
  if (content.is_locked !== 1) {
    const err = new Error('Content is not locked');
    err.status = 400;
    throw err;
  }
  if (isUnlocked(userId, contentId)) {
    const err = new Error('Already unlocked');
    err.status = 409;
    throw err;
  }

  const provider = getProvider(providerKey);
  if (!provider) {
    const err = new Error('Ad provider not available');
    err.status = 400;
    throw err;
  }

  const id = nanoid();
  const nonce = randomHex(16);
  db.prepare(
    `INSERT INTO ad_sessions
       (id, user_id, content_id, provider_key, nonce, status, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(id, userId, contentId, providerKey, nonce, plusSeconds(AD_SESSION_TTL_SECONDS), ip || null, userAgent || null);

  track('unlock_start', { userId, contentId, meta: { providerKey, sessionId: id } });

  return {
    sessionId: id,
    nonce,
    provider: {
      key: providerKey,
      config: provider.getClientConfig({ session: { id, nonce } }),
    },
    expiresAt: plusSeconds(AD_SESSION_TTL_SECONDS),
  };
}

/**
 * Step 1b (SmartLink gate only): record that the user actually opened the
 * SmartLink. The server timestamp is what the cooldown is measured against, so
 * the client cannot shorten it. Returns the cooldown seconds for the UI.
 */
export function markSmartlinkOpened({ userId, sessionId }) {
  const session = db.prepare('SELECT * FROM ad_sessions WHERE id = ?').get(sessionId);
  if (!session) return { ok: false, status: 404, reason: 'session not found' };
  if (session.user_id !== userId) {
    return { ok: false, status: 403, reason: 'session user mismatch' };
  }
  if (session.status !== 'pending') {
    return { ok: false, status: 409, reason: `session ${session.status}` };
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE ad_sessions SET status='expired' WHERE id=?").run(sessionId);
    return { ok: false, status: 410, reason: 'session expired' };
  }

  // Only set opened_at once (first open wins; prevents resetting the cooldown).
  if (!session.opened_at) {
    db.prepare('UPDATE ad_sessions SET opened_at = ? WHERE id = ?').run(nowIso(), sessionId);
  }

  const provider = getProvider(session.provider_key);
  const cfg = provider?.getClientConfig?.() || {};
  return { ok: true, cooldownSeconds: cfg.cooldownSeconds ?? 0 };
}

/**
 * Step 2: verify a reward for an ad session. Called either by:
 *  - the network's server-to-server callback (preferred), or
 *  - a client "report completion" ping that triggers a server-side poll.
 *
 * On success, marks the session "verified" and burns the nonce. Returns a
 * single-use grant token the client presents to /unlock.
 */
export async function verifyAdSession({ sessionId, payload }) {
  const session = db.prepare('SELECT * FROM ad_sessions WHERE id = ?').get(sessionId);
  if (!session) return { ok: false, status: 404, reason: 'session not found' };

  if (session.status === 'verified' || session.status === 'consumed') {
    // Idempotent: a verified session can re-issue its grant (but the unlock
    // step is what actually consumes it, guarded by the nonce ledger).
    const grant = signGrant({
      userId: session.user_id,
      contentId: session.content_id,
      adSessionId: session.id,
      nonce: session.nonce,
    });
    return { ok: true, grant, alreadyVerified: true };
  }

  if (session.status !== 'pending') {
    return { ok: false, status: 409, reason: `session ${session.status}` };
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE ad_sessions SET status='expired' WHERE id=?").run(sessionId);
    return { ok: false, status: 410, reason: 'session expired' };
  }

  const provider = getProvider(session.provider_key);
  if (!provider) return { ok: false, status: 400, reason: 'provider unavailable' };

  const result = await provider.verifyReward({ session, payload });
  if (!result.ok) {
    // Retryable failures (e.g. SmartLink cooldown not elapsed) keep the session
    // pending so the client can verify again shortly. Terminal failures (bad
    // nonce, bad signature) burn the session.
    if (!result.retryable) {
      db.prepare("UPDATE ad_sessions SET status='failed' WHERE id=?").run(sessionId);
    }
    return {
      ok: false,
      status: result.retryable ? 425 : 400,
      retryable: !!result.retryable,
      reason: result.reason || 'verification failed',
    };
  }

  // Burn the nonce atomically to prevent replayed callbacks.
  const tx = db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO used_nonces (nonce) VALUES (?)');
    const info = ins.run(session.nonce);
    if (info.changes === 0) {
      throw Object.assign(new Error('nonce already used'), { replay: true });
    }
    db.prepare(
      "UPDATE ad_sessions SET status='verified', verified_at=?, reward_amount=? WHERE id=?"
    ).run(nowIso(), result.rewardAmount || 1, sessionId);
  });

  try {
    tx();
  } catch (e) {
    if (e.replay) return { ok: false, status: 409, reason: 'replay detected' };
    throw e;
  }

  track('ad_verified', {
    userId: session.user_id,
    contentId: session.content_id,
    meta: { providerKey: session.provider_key, sessionId },
  });

  const grant = signGrant({
    userId: session.user_id,
    contentId: session.content_id,
    adSessionId: session.id,
    nonce: session.nonce,
  });
  return { ok: true, grant };
}

/**
 * Step 3: finalize the unlock using a signed grant token. This consumes the
 * ad session (single use) and records the permission server-side.
 */
export function finalizeUnlock({ userId, grantToken }) {
  const grant = verifyGrant(grantToken);
  if (!grant) return { ok: false, status: 400, reason: 'invalid grant' };
  if (grant.userId !== userId) {
    return { ok: false, status: 403, reason: 'grant user mismatch' };
  }

  const session = db.prepare('SELECT * FROM ad_sessions WHERE id = ?').get(grant.adSessionId);
  if (!session) return { ok: false, status: 404, reason: 'session not found' };
  if (session.status === 'consumed') {
    // Already unlocked by this grant — idempotent success.
    if (isUnlocked(userId, grant.contentId)) {
      return { ok: true, alreadyUnlocked: true };
    }
  }
  if (session.status !== 'verified') {
    return { ok: false, status: 409, reason: 'session not verified' };
  }

  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(grant.contentId);
  if (!content) return { ok: false, status: 404, reason: 'content not found' };

  const rule = content.unlock_rule_id
    ? db.prepare('SELECT * FROM unlock_rules WHERE id = ?').get(content.unlock_rule_id)
    : null;
  const durationSeconds = rule?.duration_seconds ?? 0;
  const expiresAt = durationSeconds > 0 ? plusSeconds(durationSeconds) : null;

  const tx = db.transaction(() => {
    db.prepare("UPDATE ad_sessions SET status='consumed', consumed_at=? WHERE id=? AND status='verified'")
      .run(nowIso(), session.id);
    db.prepare(
      `INSERT INTO unlocks (user_id, content_id, expires_at, source)
       VALUES (?, ?, ?, 'ad')
       ON CONFLICT(user_id, content_id)
       DO UPDATE SET granted_at = datetime('now'), expires_at = excluded.expires_at`
    ).run(userId, grant.contentId, expiresAt);
    db.prepare('UPDATE content SET unlocks = unlocks + 1 WHERE id = ?').run(grant.contentId);
  });
  tx();

  track('unlock', { userId, contentId: grant.contentId, meta: { source: 'ad' } });

  return { ok: true, expiresAt };
}
