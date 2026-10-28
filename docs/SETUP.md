# Setup (Windows 10)

## Prerequisites

- **Node.js 20.x or 22.x LTS, or 24.x** (this project uses the built-in
  `node:sqlite`, so **no Visual Studio / C++ build tools are required**).
  Verify: `node -v`
- A Telegram account and the [@BotFather](https://t.me/BotFather) bot.

> Why no `better-sqlite3`? On Node 24 that package has no prebuilt binary and
> tries to compile natively, which fails without Visual Studio. We use Node's
> built-in SQLite instead — zero native builds.

## 1. Create your bot (BotFather)

See [`docs/BOTFATHER.md`](BOTFATHER.md). You'll get a **bot token** — keep it
secret.

## 2. Backend

```powershell
cd backend
copy .env.example .env
```

Edit `.env` and set at minimum:

- `BOT_TOKEN` – from BotFather
- `MINI_APP_URL` – your frontend URL (for local dev: `http://localhost:5173`)
- `JWT_SECRET`, `GRANT_SECRET`, `AD_S2S_SECRET` – long random strings
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` – your admin login

Install, seed demo data, and run:

```powershell
npm install
npm run seed      # creates tables, the admin user, and demo content
npm run dev       # API + bot on http://localhost:8080
```

Health check: open http://localhost:8080/health → `{"ok":true}`.

## 3. Frontend

```powershell
cd ..\frontend
copy .env.example .env
```

Edit `.env`:

- `VITE_API_BASE=http://localhost:8080`
- `VITE_DEV_TELEGRAM_MOCK=true` (dev only)

Install and run:

```powershell
npm install
npm run dev       # http://localhost:5173
```

## 4. Admin panel

Open http://localhost:5173/admin/login and sign in with the
`ADMIN_USERNAME` / `ADMIN_PASSWORD` from your backend `.env`.

From there you can manage content, categories, unlock rules, ad providers,
settings (monetization toggle + SmartLink), and view analytics.

## Notes on local testing

- Opening the Mini App in a **plain browser** will fail user auth by design:
  there is no valid Telegram `initData` to verify server-side. The **admin
  panel works in any browser** (it uses username/password, not Telegram).
- To test the **real Mini App UI** end to end, run it inside Telegram (see
  [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) for exposing a public HTTPS URL, e.g.
  with a tunnel).
- The backend ships a `manual` ad provider for development so you can exercise
  the full unlock pipeline without a real network. It is **disabled
  automatically in production**.
