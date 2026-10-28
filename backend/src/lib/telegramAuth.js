import crypto from 'node:crypto';
import config from '../config.js';

/**
 * Verify Telegram WebApp initData per the official algorithm:
 *   secret_key = HMAC_SHA256(bot_token, "WebAppData")
 *   hash       = HMAC_SHA256(data_check_string, secret_key)
 * data_check_string is all fields except `hash`, sorted by key, joined by "\n".
 *
 * Returns the parsed, verified user object, or throws.
 *
 * @param {string} initData - the raw initData query string from Telegram.WebApp
 */
export function verifyInitData(initData) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('initData missing');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('initData hash missing');

  // Build data_check_string
  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.telegram.botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('initData signature invalid');
  }

  // Time-box the data to reduce replay window.
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > config.telegram.initDataMaxAgeSeconds) {
    throw new Error('initData expired');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('initData user missing');

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new Error('initData user malformed');
  }
  if (!user || typeof user.id !== 'number') {
    throw new Error('initData user invalid');
  }

  return {
    user,
    authDate,
    queryId: params.get('query_id') || null,
  };
}
