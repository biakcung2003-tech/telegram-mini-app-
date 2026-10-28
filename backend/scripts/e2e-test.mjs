/**
 * Local E2E smoke test. Exercises the full user + admin + unlock flow against a
 * running server on http://localhost:8080. Uses the dummy BOT_TOKEN from .env to
 * forge a valid Telegram initData signature (dev only).
 *
 * Run: node scripts/e2e-test.mjs
 */
import crypto from 'node:crypto';
import 'dotenv/config';

const BASE = 'http://localhost:8080';
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin12345';

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

function buildInitData(user) {
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('query_id', 'AAE_test');
  params.set('user', JSON.stringify(user));

  const pairs = [];
  for (const [k, v] of params.entries()) pairs.push(`${k}=${v}`);
  pairs.sort();
  const dcs = pairs.join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

async function main() {
  const user = { id: 999001, first_name: 'Test', username: 'tester', language_code: 'en' };
  const initData = buildInitData(user);
  const userHeaders = { Authorization: `tma ${initData}`, 'Content-Type': 'application/json' };

  console.log('\n1) Health');
  const health = await (await fetch(`${BASE}/health`)).json();
  check('health ok', health.ok === true);

  console.log('\n2) Auth: reject bad initData');
  const bad = await fetch(`${BASE}/api/content`, {
    headers: { Authorization: 'tma auth_date=1&user=%7B%7D&hash=deadbeef' },
  });
  check('bad initData rejected (401)', bad.status === 401, `got ${bad.status}`);

  console.log('\n3) Auth: accept valid initData, list content');
  const listRes = await fetch(`${BASE}/api/content`, { headers: userHeaders });
  check('content list 200', listRes.status === 200, `got ${listRes.status}`);
  const list = await listRes.json();
  check('content items returned', Array.isArray(list.items) && list.items.length >= 3);

  const locked = list.items.find((i) => i.isLocked && !i.unlocked);
  check('found a locked item', !!locked);
  check('locked item hides body', locked && locked.body === undefined);

  console.log('\n4) Content detail + unlock options');
  const detail = await (await fetch(`${BASE}/api/content/${locked.id}`, { headers: userHeaders })).json();
  check('detail has unlock info', !!detail.item.unlock);
  check('detail lists a rewarded provider', detail.item.unlock.providers.some((p) => p.key === 'manual'));
  check('locked detail still hides body', detail.item.body === undefined);

  console.log('\n5) Start ad session');
  const startRes = await fetch(`${BASE}/api/ads/start`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ contentId: locked.id, providerKey: 'manual' }),
  });
  const start = await startRes.json();
  check('ad start 200', startRes.status === 200, JSON.stringify(start));
  check('got sessionId + nonce', !!start.sessionId && !!start.nonce);

  console.log('\n6) Verify with WRONG nonce (should fail)');
  const badVerify = await fetch(`${BASE}/api/ads/verify`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ sessionId: start.sessionId, nonce: 'wrong-nonce' }),
  });
  check('wrong nonce rejected', badVerify.status >= 400, `got ${badVerify.status}`);

  console.log('\n7) Start a fresh session + verify correctly (previous one is now failed)');
  const start2 = await (await fetch(`${BASE}/api/ads/start`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ contentId: locked.id, providerKey: 'manual' }),
  })).json();
  const verifyRes = await fetch(`${BASE}/api/ads/verify`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ sessionId: start2.sessionId, nonce: start2.nonce }),
  });
  const verify = await verifyRes.json();
  check('verify ok 200', verifyRes.status === 200, JSON.stringify(verify));
  check('got grant token', !!verify.grant);

  console.log('\n8) Finalize unlock with grant');
  const unlockRes = await fetch(`${BASE}/api/ads/unlock`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ grant: verify.grant }),
  });
  const unlock = await unlockRes.json();
  check('unlock ok 200', unlockRes.status === 200, JSON.stringify(unlock));

  console.log('\n9) Replay the SAME grant (should be idempotent / not double-unlock, not error-crash)');
  const replay = await fetch(`${BASE}/api/ads/unlock`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ grant: verify.grant }),
  });
  const replayJson = await replay.json();
  check('replayed grant handled (ok idempotent)', replay.status === 200 && replayJson.ok === true, `got ${replay.status} ${JSON.stringify(replayJson)}`);

  console.log('\n10) Content now unlocked -> body visible');
  const detail2 = await (await fetch(`${BASE}/api/content/${locked.id}`, { headers: userHeaders })).json();
  check('unlocked detail exposes body', typeof detail2.item.body === 'string' && detail2.item.body.length > 0);
  check('unlocked flag true', detail2.item.unlocked === true);

  console.log('\n11) me/unlocks lists it');
  const mine = await (await fetch(`${BASE}/api/me/unlocks`, { headers: userHeaders })).json();
  check('unlock in my list', mine.unlocks.some((u) => u.contentId === locked.id));

  console.log('\n12) Admin login + analytics + content CRUD');
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  const login = await loginRes.json();
  check('admin login 200', loginRes.status === 200, JSON.stringify(login));
  check('admin token issued', !!login.token);
  const adminHeaders = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };

  const wrongLogin = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: 'nope' }),
  });
  check('bad admin creds rejected', wrongLogin.status === 401);

  const analytics = await (await fetch(`${BASE}/api/admin/analytics`, { headers: adminHeaders })).json();
  check('analytics returns totals', analytics.totals && analytics.totals.unlocks >= 1, JSON.stringify(analytics.totals));
  check('analytics counted ad_verified', analytics.totals.adVerified >= 1);

  const created = await (await fetch(`${BASE}/api/admin/content`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ title: 'E2E Created', description: 'x', body: 'secret', isLocked: true, isPublished: true }),
  })).json();
  check('admin created content', !!created.id);

  const del = await fetch(`${BASE}/api/admin/content/${created.id}`, { method: 'DELETE', headers: adminHeaders });
  check('admin deleted content', del.status === 200);

  const providers = await (await fetch(`${BASE}/api/admin/providers`, { headers: adminHeaders })).json();
  check('admin sees available providers', providers.available.some((p) => p.key === 'generic_s2s'));
  check('admin sees smartlink provider', providers.available.some((p) => p.key === 'smartlink'));

  console.log('\n12b) SmartLink gate: configure, enable (cooldown 2s)');
  await fetch(`${BASE}/api/admin/providers`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({
      key: 'smartlink', label: 'Adsterra SmartLink', enabled: true, rewarded: true,
      config: { url: 'https://example.com/smartlink', label: 'Sponsored', cooldownSeconds: 2 },
    }),
  });
  const slContentId = list.items.find((i) => i.isLocked && i.id !== locked.id).id;

  const slStart = await (await fetch(`${BASE}/api/ads/start`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ contentId: slContentId, providerKey: 'smartlink' }),
  })).json();
  check('smartlink start ok', !!slStart.sessionId, JSON.stringify(slStart));
  check('smartlink client config has url + cooldown', slStart.provider?.config?.url === 'https://example.com/smartlink' && slStart.provider?.config?.cooldownSeconds === 2);

  console.log('   verify BEFORE opening (should fail: link not opened)');
  const slEarly = await fetch(`${BASE}/api/ads/verify`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ sessionId: slStart.sessionId, nonce: slStart.nonce }),
  });
  check('verify fails before link opened', slEarly.status >= 400, `got ${slEarly.status}`);

  console.log('   open link, then verify IMMEDIATELY (should fail: cooldown)');
  // start a fresh session (previous one is now failed)
  const slStart2 = await (await fetch(`${BASE}/api/ads/start`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ contentId: slContentId, providerKey: 'smartlink' }),
  })).json();
  await fetch(`${BASE}/api/ads/smartlink-opened`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ sessionId: slStart2.sessionId }),
  });
  const slTooSoon = await fetch(`${BASE}/api/ads/verify`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ sessionId: slStart2.sessionId, nonce: slStart2.nonce }),
  });
  check('verify fails during cooldown', slTooSoon.status >= 400, `got ${slTooSoon.status}`);

  console.log('   wait out cooldown, verify + unlock (should succeed)');
  await new Promise((r) => setTimeout(r, 2200));
  const slVerify = await (await fetch(`${BASE}/api/ads/verify`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ sessionId: slStart2.sessionId, nonce: slStart2.nonce }),
  })).json();
  check('smartlink verify ok after cooldown', !!slVerify.grant, JSON.stringify(slVerify));
  const slUnlock = await fetch(`${BASE}/api/ads/unlock`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ grant: slVerify.grant }),
  });
  check('smartlink unlock ok', slUnlock.status === 200, `got ${slUnlock.status}`);

  // Clean up: remove smartlink provider so later monetization test uses manual.
  await fetch(`${BASE}/api/admin/providers/smartlink`, { method: 'DELETE', headers: adminHeaders });

  console.log('\n13) Admin auth required');
  const noAuth = await fetch(`${BASE}/api/admin/analytics`);
  check('admin endpoint blocks unauthenticated', noAuth.status === 401);

  console.log('\n14) Monetization toggle hides unlock options');
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT', headers: adminHeaders,
    body: JSON.stringify({ monetization_enabled: 'false' }),
  });
  const start3 = await fetch(`${BASE}/api/ads/start`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ contentId: locked.id, providerKey: 'manual' }),
  });
  // locked item is already unlocked for this user (409), so use another locked item
  const anotherLocked = list.items.find((i) => i.isLocked && i.id !== locked.id);
  const start3b = await fetch(`${BASE}/api/ads/start`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ contentId: anotherLocked.id, providerKey: 'manual' }),
  });
  check('ad start blocked when monetization off', start3b.status === 403, `got ${start3b.status}`);
  // restore
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT', headers: adminHeaders,
    body: JSON.stringify({ monetization_enabled: 'true' }),
  });

  console.log(`\n──────────────\nPASSED: ${passed}   FAILED: ${failed}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
