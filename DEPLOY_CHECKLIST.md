# 🚀 Deploy Checklist — ဖြည့်ရမယ့်အရာ အကုန် (copy-paste ready)

Git repo က commit လုပ်ပြီးပြီ (secret မပါ)။ အခု ၄ ဆင့်သာ ကျန်ပါတယ်။
တန်ဖိုးတွေ အကုန် ဒီမှာ စုထားပေးပြီးသားပါ။

---

## ☑️ အဆင့် ၁ — GitHub တင်

GitHub.com မှာ repo အသစ်ဖန်တီး (ဥပမာ `telegram-mini-app`)။ ပြီးရင်
PowerShell မှာ (`<သင့်user>` နဲ့ `<repo>` ကို ပြောင်းပါ) —

```powershell
cd "d:\Telegram MiNi App"
git remote add origin https://github.com/<သင့်user>/<repo>.git
git push -u origin main
```

---

## ☑️ အဆင့် ၂ — Render (Backend)

https://render.com → New → **Blueprint** → GitHub repo ရွေး →
`render.yaml` ကို auto-detect လုပ်မယ် → Apply။

**Environment မှာ ဖြည့်ရန် (dashboard):**

```
BOT_TOKEN=7208215944:AAGgR09pA_kPqz-yulTZXQCzNX5_1GWDhZQ
ADSTERRA_SMARTLINK_URL=https://auctionr.org/4/441e26e1321f9553598dd315fc000f66
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<ခိုင်ခံ့တဲ့ password ထည့်ပါ>
```

Deploy ပြီးရင် Render URL ရမယ် (ဥပမာ `https://tma-adgated-backend.onrender.com`)။
ချက်ချင်း ဒီ ၂ ခု ဖြည့် (URL ကို ကိုယ့်ဟာနဲ့ အစားထိုး) —

```
PUBLIC_BACKEND_URL=https://tma-adgated-backend.onrender.com
BOT_WEBHOOK_DOMAIN=https://tma-adgated-backend.onrender.com
```

> `NODE_ENV`, `DATA_DIR`, `UPLOAD_DIR`, `BOT_MODE`, `JWT_SECRET`,
> `GRANT_SECRET`, `AD_S2S_SECRET` — အလိုအလျောက် (ဖြည့်စရာမလို)။

**စစ်:** `https://<render-url>/health` → `{"ok":true}`

---

## ☑️ အဆင့် ၃ — Cloudflare Pages (Frontend)

https://dash.cloudflare.com → Workers & Pages → Create → Pages →
Connect to Git → repo ရွေး။

**Build settings:**
```
Root directory      = frontend
Build command       = npm run build
Output directory    = dist
```

**Environment variables (Production):**  *(VITE_API_BASE = အဆင့် ၂ Render URL)*
```
VITE_API_BASE=https://tma-adgated-backend.onrender.com
VITE_DEV_TELEGRAM_MOCK=false
```

Deploy ပြီးရင် Cloudflare URL ရမယ် (ဥပမာ `https://your-app.pages.dev`)။

---

## ☑️ အဆင့် ၄ — Render ကို ပြန်ဖြည့် (Cloudflare URL ချိတ်)

Render → Environment မှာ ဒီ ၂ ခု ထည့် (Cloudflare URL နဲ့ အစားထိုး) —
```
MINI_APP_URL=https://your-app.pages.dev
CORS_ORIGINS=https://your-app.pages.dev
```
Render auto-redeploy လုပ်မယ်။ ပြီးရင် ပြီးပါပြီ! ✅

---

## ☑️ အဆင့် ၅ — စမ်း

1. Telegram → **@togetvideoname_bot** → `/start` → "🚀 Open App" ✅
2. Admin: `https://your-app.pages.dev/admin/login`
   (admin / အဆင့် ၂ မှာ ထည့်ခဲ့တဲ့ password)

---

## 📌 သင် ဆုံးဖြတ်ဖြည့်ရမယ့်ဟာ (တစ်ခုတည်း)
- **ADMIN_PASSWORD** — ဥပမာ `TmaAdmin!2026xyz` (ကိုယ်ပိုင် ခိုင်ခံ့တဲ့ဟာ)

## 📌 Deploy လုပ်မှ ရလာမယ့် URL (၄ ခု — ဥပမာအတိုင်း အစားထိုး)
- Render URL → `PUBLIC_BACKEND_URL`, `BOT_WEBHOOK_DOMAIN`, `VITE_API_BASE`
- Cloudflare URL → `MINI_APP_URL`, `CORS_ORIGINS`

## ⚠️ Security
- Bot token ကို chat မှာ ပို့ပြီးသားမို့ @BotFather `/revoke` နဲ့ token
  အသစ်ယူပြီး Render env မှာ update လုပ်သင့် (ngrok authtoken လည်း
  dashboard မှာ regenerate)။
