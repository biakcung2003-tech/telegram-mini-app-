# Security

## Telegram identity

- Every user request carries Telegram `initData` in
  `Authorization: tma <initData>`.
- The server verifies it with the official algorithm
  (`HMAC_SHA256` with a secret derived from the bot token) in
  `backend/src/lib/telegramAuth.js`, using a constant-time comparison.
- `auth_date` is time-boxed (`INITDATA_MAX_AGE_SECONDS`) to limit replay.
- The bot token lives only in `BOT_TOKEN` (server env) and is **never** sent to
  the client.

## Content authorization

- Locked content never includes its `body` in API responses unless the server
  confirms an active unlock for that user (`isUnlocked`), which also respects
  per-rule expiry.
- Unlock permissions are stored **server-side** (`unlocks` table) and are the
  single source of truth.

## Unlock integrity

- Single-use ad sessions + nonce ledger + HMAC-signed one-time grant tokens.
- See [`AD_PROVIDERS.md`](AD_PROVIDERS.md) for the full flow and replay defenses.

## Admin

- Passwords hashed with scrypt + per-user salt; constant-time verification.
- Admin auth via JWT (httpOnly cookie or Bearer), 12h expiry.
- Login endpoint is rate-limited (`adminLoginLimiter`).
- Bootstrap admin is created from env on first run; change the password.

## Transport & headers

- `helmet` sets security headers.
- CORS is restricted to `CORS_ORIGINS`.
- JSON body size limited; file uploads limited to 5 MB and image MIME types.

## Rate limiting

- General API: 120 req/min per IP.
- Unlock/ad endpoints: 20 req/min per IP.
- Admin login: 10 attempts / 15 min per IP.

## Secrets & environment

- All secrets come from environment variables; `.env` is git-ignored.
- Generate long random values for `JWT_SECRET`, `GRANT_SECRET`, `AD_S2S_SECRET`.
- Per-provider S2S secrets are stored in the provider `config` (server-side)
  and are never exposed via `getClientConfig()`.

## Production hardening checklist

- [ ] `NODE_ENV=production` (auto-disables the `manual` ad provider).
- [ ] Strong, unique `ADMIN_PASSWORD`; rotate the bootstrap password.
- [ ] HTTPS everywhere (Telegram requires it for Mini Apps).
- [ ] Set `CORS_ORIGINS` to your exact frontend origin(s).
- [ ] Use `BOT_MODE=webhook` with a valid `BOT_WEBHOOK_DOMAIN`.
- [ ] Put the backend behind a trusted reverse proxy (`trust proxy` is on).
- [ ] Back up the SQLite file in `backend/data/`.
- [ ] Review each enabled ad provider actually permits rewarded content access.
