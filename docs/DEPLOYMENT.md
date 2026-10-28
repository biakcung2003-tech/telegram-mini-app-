# Deployment

The app has two deployables: the **frontend** (static, → Cloudflare Pages) and
the **backend** (Node server + bot + SQLite, → any Node host).

## Frontend → Cloudflare Pages

1. Push this repo to GitHub/GitLab.
2. In Cloudflare Pages, create a project from the repo.
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
3. Environment variables (Production):
   - `VITE_API_BASE` = your backend public URL (e.g. `https://api.yourdomain.com`)
   - `VITE_DEV_TELEGRAM_MOCK` = `false`
4. Deploy. Note the URL (e.g. `https://your-app.pages.dev`).

The included `frontend/public/_redirects` (`/* /index.html 200`) makes client
-side routes like `/content/:id` and `/admin` work on direct load/refresh.

## Backend → a Node host

Pick any host that runs Node 20/22/24 with a persistent disk for the SQLite
file (e.g. Fly.io, Railway, Render, a VPS, etc.). Because we use `node:sqlite`,
there are **no native build steps**.

1. Set environment variables (see `backend/.env.example`). Critically:
   - `NODE_ENV=production`
   - `BOT_TOKEN`, `MINI_APP_URL` (your Pages URL)
   - `PUBLIC_BACKEND_URL` (this backend's public https URL)
   - `CORS_ORIGINS` = your Pages URL
   - `JWT_SECRET`, `GRANT_SECRET`, `AD_S2S_SECRET`, `ADMIN_PASSWORD`
   - `BOT_MODE=webhook` and `BOT_WEBHOOK_DOMAIN=https://api.yourdomain.com`
2. Persist `backend/data/` (SQLite DB) and `backend/uploads/` (thumbnails) on a
   durable volume.
3. Start:
   ```
   npm install
   npm run seed     # first deploy only (creates schema + admin)
   npm start
   ```
4. Point your bot's Menu Button / Web App URL at the Pages URL (see
   [`BOTFATHER.md`](BOTFATHER.md)).

### Webhook vs polling

- **Polling** (`BOT_MODE=polling`) is simplest for local dev.
- **Webhook** (`BOT_MODE=webhook`) is recommended in production. The server
  registers `https://<BOT_WEBHOOK_DOMAIN>/bot/<token>` automatically on start.

### Ad network callbacks

Configure your approved rewarded network to send its server-to-server reward
callback to:

```
POST https://api.yourdomain.com/api/ads/callback/<providerKey>
```

with the signed fields your provider's `verifyReward()` expects (see
[`AD_PROVIDERS.md`](AD_PROVIDERS.md)).

## Post-deploy smoke test

- `GET https://api.yourdomain.com/health` → `{"ok":true}`.
- Open the bot, `/start`, launch the Mini App, browse content.
- Sign in to `/admin`, create content, toggle monetization.
- Confirm a locked item's `body` is absent in the network response until
  unlocked.
