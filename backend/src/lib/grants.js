import config from '../config.js';
import { hmac, safeEqualHex } from './crypto.js';

/**
 * A grant token binds (userId, contentId, adSessionId, nonce) together and is
 * signed by the server. It is single-use: the ad_session it references is
 * marked "consumed" when the unlock is finalized, so a replayed token is
 * rejected even if its signature is valid.
 */
export function signGrant({ userId, contentId, adSessionId, nonce }) {
  const payload = `${userId}.${contentId}.${adSessionId}.${nonce}`;
  const sig = hmac(config.auth.grantSecret, payload);
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url');
}

export function verifyGrant(token) {
  let decoded;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = decoded.split('.');
  if (parts.length !== 5) return null;
  const [userId, contentId, adSessionId, nonce, sig] = parts;
  const expected = hmac(
    config.auth.grantSecret,
    `${userId}.${contentId}.${adSessionId}.${nonce}`
  );
  if (!safeEqualHex(sig, expected)) return null;
  return {
    userId: Number(userId),
    contentId: Number(contentId),
    adSessionId,
    nonce,
  };
}
