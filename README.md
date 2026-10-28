# Telegram Mini App — Ad-Gated Content Platform

A production-oriented Telegram Mini App where users browse content and unlock
locked items **only after a verified rewarded-ad completion**. Includes a secure
admin panel, a modular ad-provider system, and a Telegraf bot.

> **Important compliance note on Adsterra**
> Adsterra SmartLinks are **not** a rewarded-video product and Adsterra does not
> provide a server-to-server reward callback for SmartLinks. Therefore, per your
> requirements, this project treats SmartLinks as **optional sponsored links only**.
> They never unlock content. Returning from a SmartLink is **not** treated as an
> ad completion. Content unlocking is wired to a **modular rewarded-ad provider
> interface** that requires genuine server-side verification (see
> `docs/AD_PROVIDERS.md`). A `manual`/`test` provider exists for local development
> only and is **disabled in production** by an explicit environment guard.

## Monorepo layout

```
Telegram MiNi App/
├─ backend/        Express + SQLite + Telegraf bot + ad verification
├─ frontend/       React + Vite + TypeScript + Tailwind (Mini App + Admin)
├─ docs/           Setup, deployment, ad-provider, and security docs
└─ README.md
```

## Quick start (Windows 10)

```powershell
# 1. Backend
cd backend
copy .env.example .env     # then edit values
npm install
npm run dev                # starts API + bot on http://localhost:8080

# 2. Frontend (new terminal)
cd frontend
copy .env.example .env     # then edit values
npm install
npm run dev                # starts Vite on http://localhost:5173
```

See [`docs/SETUP.md`](docs/SETUP.md), [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md),
[`docs/AD_PROVIDERS.md`](docs/AD_PROVIDERS.md), and [`docs/SECURITY.md`](docs/SECURITY.md).

## Feature checklist

- Telegram `initData` verified **server-side** (HMAC-SHA256, time-boxed).
- Mobile-first Mini App UI: thumbnails, categories, search, detail pages,
  locked/unlocked states.
- Unlock flow with explicit consent, verified rewarded-ad completion, and
  server-side permission storage.
- Replay-attack prevention via one-time signed grant tokens + nonce ledger.
- Modular ad-provider system (`backend/src/ads/providers`).
- Adsterra SmartLink support as **labeled sponsored links**, admin-configurable.
- Secure admin panel: content CRUD, thumbnail upload, provider config, unlock
  rules, analytics, monetization toggle.
- Rate limiting, fraud checks, env-based secrets, bot token never exposed.
