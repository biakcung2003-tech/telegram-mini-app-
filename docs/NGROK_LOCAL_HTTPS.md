# ngrok နဲ့ local HTTPS (Telegram Mini App စမ်းဖို့)

Telegram Mini App က HTTPS URL လိုအပ်လို့၊ `http://localhost:5173` ကို
တိုက်ရိုက်မသုံးနိုင်ပါ။ ngrok က localhost ကို HTTPS URL
(`https://xxxx.ngrok-free.app`) အဖြစ် ထုတ်ပေးပါတယ်။

> မှတ်ချက်: ngrok binary ကို auto-download လုပ်တဲ့အခါ Windows Defender က
> false-positive block လုပ်တတ်လို့၊ အောက်ပါ **တရားဝင်နည်း** ၂ မျိုးထဲက
> တစ်ခုနဲ့ install လုပ်ပါ။

---

## အဆင့် ၁ — ngrok install (တစ်ကြိမ်သာ)

**နည်း A — တရားဝင် installer (အကြံပြု):**
1. https://ngrok.com/download → Windows ကို download
2. (သို့) https://dashboard.ngrok.com/get-started/setup/windows မှာ
   ညွှန်ကြားချက်အတိုင်း

**နည်း B — Chocolatey ရှိရင်:**
```powershell
choco install ngrok
```

**နည်း C — Scoop ရှိရင်:**
```powershell
scoop install ngrok
```

install ပြီးရင် စစ်ပါ —
```powershell
ngrok version
```

---

## အဆင့် ၂ — authtoken ထည့် (တစ်ကြိမ်သာ)

```powershell
ngrok config add-authtoken 3LKiH2BqBt67CUdMkK5u6EpWqoO_4HdQ288fgvXxKJZGrU6qd
```

> ⚠️ ဒီ token ကို chat မှာ ပို့ပြီးသားမို့ ngrok dashboard
> (https://dashboard.ngrok.com/get-started/your-authtoken) မှာ
> regenerate လုပ်သင့်ပါတယ်။ regenerate လုပ်ရင် အထက်က command ကို
> token အသစ်နဲ့ ပြန် run ပါ။

---

## အဆင့် ၃ — tunnel စဖွင့်

frontend (port 5173) ကို expose လုပ်မယ် —
```powershell
ngrok http 5173
```

output မှာ ဒီလို line ပေါ်လာမယ် —
```
Forwarding   https://abcd-1234.ngrok-free.app -> http://localhost:5173
```
အဲ့ဒီ **https://...** URL ကို copy ကူးပါ။

> ngrok window ကို **ဖွင့်ထားပါ** — ပိတ်ရင် tunnel ပြတ်သွားမယ်။

---

## အဆင့် ၄ — URL ကို .env မှာ ထည့် + backend restart

`backend\.env` ဖိုင်မှာ —
```
MINI_APP_URL=https://abcd-1234.ngrok-free.app
CORS_ORIGINS=https://abcd-1234.ngrok-free.app,http://localhost:5173
```
ပြီးရင် backend ကို restart (Ctrl+C ပြီး `npm run dev`)။
log မှာ HTTPS warning မပေါ်တော့ရင် ဆင်ပြေပါပြီ။

---

## အဆင့် ၅ — စမ်း

1. backend + frontend နှစ်ခုလုံး run ထား (START.bat)
2. ngrok tunnel run ထား
3. Telegram မှာ **@togetvideoname_bot** ကို `/start` ပို့
4. "🚀 Open App" ခလုတ် ပေါ်လာမယ် → နှိပ်ရင် Mini App ပွင့်မယ်

---

## အရေးကြီးချက်များ

- ngrok free URL က **restart တိုင်း ပြောင်း**ပါတယ်။ ပြောင်းတိုင်း `.env` ရဲ့
  `MINI_APP_URL` ကို update ပြီး backend restart လုပ်ပါ။
- frontend ကိုတော့ ngrok နဲ့ expose လုပ်ရုံ လုံလောက်ပါတယ်
  (frontend က backend ကို `VITE_API_BASE=http://localhost:8080` နဲ့ ခေါ်တယ်)။
  **ဒါပေမယ့်** Mini App က ngrok (https) ကနေ load လုပ်တဲ့အခါ browser က
  https page ကနေ http backend ကို ခေါ်ရင် **mixed-content** block ဖြစ်နိုင်လို့၊
  backend ကိုပါ ngrok နဲ့ expose လုပ်ဖို့ လိုနိုင်ပါတယ် (အောက်ကြည့်ပါ)။

### backend ကိုပါ https ဖြစ်ချင်ရင် (လိုအပ်မှ)
terminal အသစ်တစ်ခုမှာ —
```powershell
ngrok http 8080
```
ရလာတဲ့ URL ကို `frontend\.env` မှာ —
```
VITE_API_BASE=https://<backend-ngrok-url>
```
ပြီးရင် `CORS_ORIGINS` (backend .env) မှာ frontend ngrok URL ထည့်ပြီး
frontend ကို restart ပါ။

> ngrok free plan က **တစ်ချိန်တည်း tunnel တစ်ခုသာ** ရတတ်ပါတယ်။ backend+frontend
> နှစ်ခုလုံး https လိုရင် ngrok paid (သို့) Cloudflare Pages deploy
> (docs/DEPLOYMENT.md) က ပိုသင့်တော်ပါတယ်။
