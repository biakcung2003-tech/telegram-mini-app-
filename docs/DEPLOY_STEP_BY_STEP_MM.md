# Deploy အစအဆုံး (မြန်မာ) — Cloudflare Pages + Render

ဒီ guide က production deploy အပြည့်အစုံကို အဆင့်ဆင့် ရှင်းပြထားပါတယ်။
- **Frontend** → Cloudflare Pages (static, HTTPS, URL မပြောင်း)
- **Backend + Bot** → Render.com (Node host + persistent disk)

အကုန် **အခမဲ့ tier** နဲ့ စမ်းလို့ရပါတယ်။

---

## အဆင့် ၀ — လိုအပ်တာများ

- GitHub account (code တင်ဖို့)
- Cloudflare account (frontend)
- Render account (backend)
- သင့် bot token (ရှိပြီး): `@togetvideoname_bot`
- သင့် Adsterra SmartLink (ရှိပြီး)

---

## အဆင့် ၁ — Code ကို GitHub တင်

PowerShell မှာ project folder ထဲက —
```powershell
cd "d:\Telegram MiNi App"
git init
git add .
git commit -m "Telegram ad-gated mini app"
```

> ⚠️ `.gitignore` က `.env`, `node_modules`, `data/`, `uploads/` ကို
> ချန်ထားပြီးသားမို့ secret တွေ GitHub မရောက်ပါ (ကောင်းတယ်)။

GitHub မှာ repo အသစ်ဖန်တီး → ပြီးရင် —
```powershell
git remote add origin https://github.com/<သင့်user>/<repo>.git
git branch -M main
git push -u origin main
```

---

## အဆင့် ၂ — Backend deploy (Render)

1. https://render.com ဝင် → **New** → **Blueprint**
2. သင့် GitHub repo ကို ချိတ် → Render က `render.yaml` ကို ဖတ်ပြီး
   `tma-adgated-backend` service ကို အလိုအလျောက် setup လုပ်မယ်
3. **Environment variables** တွေ ဖြည့် (dashboard မှာ) —
   | Key | Value |
   |-----|-------|
   | `BOT_TOKEN` | `7208215944:AAGgR09pA_kPqz-yulTZXQCzNX5_1GWDhZQ` |
   | `ADMIN_USERNAME` | သင်ကြိုက်တာ (ဥပမာ admin) |
   | `ADMIN_PASSWORD` | ခိုင်ခံ့တဲ့ password |
   | `ADSTERRA_SMARTLINK_URL` | `https://auctionr.org/4/441e26e1321f9553598dd315fc000f66` |
   | `MINI_APP_URL` | *(အဆင့် ၃ ပြီးမှ — Cloudflare URL)* |
   | `PUBLIC_BACKEND_URL` | Render URL (အောက်ကြည့်) |
   | `BOT_WEBHOOK_DOMAIN` | Render URL (အောက်ကြည့်) |
   | `CORS_ORIGINS` | *(အဆင့် ၃ ပြီးမှ — Cloudflare URL)* |

   > `JWT_SECRET`, `GRANT_SECRET`, `AD_S2S_SECRET` ကို Render က
   > အလိုအလျောက် generate လုပ်ပေးပါတယ် (render.yaml ထဲ သတ်မှတ်ပြီး)။
4. Deploy ပြီးရင် service URL ရမယ်: ဥပမာ
   `https://tma-adgated-backend.onrender.com`
   - အဲ့ URL ကို `PUBLIC_BACKEND_URL` **နဲ့** `BOT_WEBHOOK_DOMAIN` မှာ ထည့်
5. `https://tma-adgated-backend.onrender.com/health` ဖွင့်ကြည့် →
   `{"ok":true}` ပြရင် အောင်မြင်ပြီ

> မှတ်ချက်: Render free tier က ၁၅ မိနစ် idle ဖြစ်ရင် sleep ဝင်တယ်
> (ပထမ request က နှေးမယ်)။ စမ်းဖို့ ရပါတယ်။

---

## အဆင့် ၃ — Frontend deploy (Cloudflare Pages)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**
2. သင့် repo ကို ရွေး → settings —
   | Setting | Value |
   |---------|-------|
   | **Project root directory** | `frontend` |
   | **Build command** | `npm run build` |
   | **Build output directory** | `dist` |
   | **Framework preset** | Vite (ရှိရင်) |
3. **Environment variables** (Production) —
   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE` | သင့် Render URL (ဥပမာ `https://tma-adgated-backend.onrender.com`) |
   | `VITE_DEV_TELEGRAM_MOCK` | `false` |
4. **Save and Deploy** → ပြီးရင် URL ရမယ်:
   ဥပမာ `https://your-app.pages.dev`

> `frontend/public/_redirects` က SPA routing (`/content/:id`, `/admin`) ကို
> ပြုပြင်ပေးပြီးသားပါ။

---

## အဆင့် ၄ — URL တွေ ချိတ်ဆက် (Render dashboard ပြန်ပြင်)

အဆင့် ၃ ကရလာတဲ့ Cloudflare URL ကို Render env မှာ ဖြည့် —
| Key | Value |
|-----|-------|
| `MINI_APP_URL` | `https://your-app.pages.dev` |
| `CORS_ORIGINS` | `https://your-app.pages.dev` |

Render က env ပြောင်းရင် auto-redeploy လုပ်မယ်။ redeploy ပြီးတာနဲ့ bot က
webhook mode နဲ့ `MINI_APP_URL` (https) ကို "Open App" ခလုတ်မှာ သုံးမယ်။

---

## အဆင့် ၅ — Bot ကို စမ်း

1. Telegram မှာ **@togetvideoname_bot** ဖွင့် → `/start`
2. "🚀 Open App" ခလုတ် ပေါ်လာမယ် → နှိပ် → Mini App ပွင့်မယ် ✅
3. (optional) @BotFather → `/mybots` → bot → Bot Settings → Menu Button →
   Cloudflare URL ထည့် (chat ထဲက menu button အတွက်)

---

## အဆင့် ၆ — Admin panel + SmartLink စစ်

1. `https://your-app.pages.dev/admin/login` ဝင် (Render env ထဲက
   ADMIN_USERNAME / ADMIN_PASSWORD နဲ့)
2. **Ad Providers** → `smartlink` က enabled ဖြစ်နေတာ တွေ့ရမယ်
   (render.yaml seed ကနေ auto-config) — cooldown ကြိုက်သလို ပြင်
3. **Content** → locked content ဖန်တီး/ပြင်
4. Telegram ထဲက Mini App မှာ locked content ဖွင့် → "Unlock" →
   SmartLink ပွင့် → cooldown ကျော် → unlock ✅

---

## Troubleshooting

- **"Open App" ခလုတ် မပေါ်ဘူး** → `MINI_APP_URL` က https ဖြစ်ရမယ်၊
  Render redeploy ပြီးပြီလား စစ်။
- **Mini App မှာ "Failed to load"** → `VITE_API_BASE` (Cloudflare) က မှန်ကန်တဲ့
  Render URL ကို ညွှန်ရမယ်၊ `CORS_ORIGINS` (Render) မှာ Cloudflare URL
  ပါရမယ်။
- **401 / auth fail** → Telegram ထဲကဖွင့်မှ user auth အောင်မယ် (browser
  သာမန်မှာ မအောင်ဘူး — design အတိုင်း)။ Admin panel ကတော့ browser မှာ အောင်မယ်။
- **Render sleep** → free tier idle sleep၊ ပထမ request နှေးတာ ပုံမှန်။
