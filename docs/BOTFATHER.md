# BotFather setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`. Choose a name and a username ending in `bot`.
3. BotFather returns an **HTTP API token** like `123456:ABC-DEF...`.
   Put it in `backend/.env` as `BOT_TOKEN`. **Never commit it.**

## Attach the Mini App

You can open the Mini App from the `/start` button (handled by this bot's
Telegraf code) and/or configure a Menu Button:

1. In BotFather send `/mybots` → pick your bot → **Bot Settings** →
   **Menu Button** → **Configure menu button**.
2. Enter your Mini App URL (your deployed frontend, e.g.
   `https://your-app.pages.dev`) and a button label (e.g. "Open App").

Alternatively, register a Web App directly:

1. `/newapp` → select your bot → provide title, description, photo, and the
   Web App URL.

## Test

- Open your bot and send `/start`. You should see a welcome message with an
  **Open App** button that launches the Mini App.
- Commands available: `/start`, `/open`, `/help`.

## Local development with a tunnel

Telegram Mini Apps require **HTTPS**. For local testing, expose your frontend
(`http://localhost:5173`) via a tunnel (e.g. Cloudflare Tunnel or ngrok) and use
that HTTPS URL as the Menu Button / `MINI_APP_URL`. Point `VITE_API_BASE` at a
tunnel for the backend too, or deploy the backend.
