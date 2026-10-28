# Telegram Bot နှင့် Adsterra ချိတ်ဆက်ခြင်း (လက်တွေ့လမ်းညွှန်)

ဒီ guide က code အသစ်ရေးစရာမလိုဘဲ သင့်ဘက်က **credential/config ဖြည့်ရုံ**နဲ့
Telegram bot နဲ့ Adsterra ချိတ်ဆက်ပုံကို ရှင်းပြထားပါတယ်။

---

## အပိုင်း ၁ — Telegram Bot

### အဆင့် ၁: BotFather ကနေ token ယူပါ
1. Telegram မှာ **@BotFather** ဖွင့်ပါ
2. `/newbot` ရိုက် → bot နာမည် + username (`bot` နဲ့ဆုံးရမယ်) ပေးပါ
3. Token ရလာမယ်: ဥပမာ `7891234567:AAE-xxxxxxxxxxxxxxxxxxxxxxxx`

### အဆင့် ၂: token ကို .env မှာ ဖြည့်ပါ
`backend\.env` ဖိုင်ကို ဖွင့်ပြီး —
```
BOT_TOKEN=7891234567:AAE-xxxxxxxxxxxxxxxxxxxxxxxx
MINI_APP_URL=http://localhost:5173
```
> Local စမ်းရင် `MINI_APP_URL` ကို localhost ထားလို့ရပေမယ့်၊ Telegram က
> **HTTPS URL** ကိုသာ Mini App အဖြစ် လက်ခံပါတယ် (အောက်က အဆင့် ၄ ကြည့်ပါ)။

### အဆင့် ၃: backend ကို restart လုပ်ပါ
`START.bat` ပြန်ဖွင့် (သို့) backend terminal မှာ `Ctrl+C` ပြီး `npm run dev`။
backend log မှာ `[bot] polling started` ပေါ်ရင် bot အလုပ်လုပ်ပါပြီ။
အခု Telegram မှာ bot ကို `/start` ပို့ကြည့်ပါ — "Open App" ခလုတ်ပါတဲ့
welcome message ပြန်လာရပါမယ်။

### အဆင့် ၄: Mini App ကို HTTPS နဲ့ ဖွင့်နိုင်အောင် (တကယ်စမ်းဖို့)
Telegram Mini App က HTTPS လိုအပ်လို့ localhost ကို တိုက်ရိုက်မသုံးနိုင်ပါ။
နည်းလမ်း ၂ မျိုး —

**(က) Tunnel သုံးခြင်း (local စမ်းဖို့ အမြန်ဆုံး):**
```powershell
# ngrok ဥပမာ
ngrok http 5173
```
ရလာတဲ့ `https://xxxx.ngrok-free.app` ကို `.env` ရဲ့ `MINI_APP_URL` မှာ ထည့်ပါ။

**(ခ) Deploy လုပ်ခြင်း (production):**
frontend ကို Cloudflare Pages သို့ တင် → ရလာတဲ့ `https://your-app.pages.dev`
ကို `MINI_APP_URL` မှာ ထည့်ပါ။ (docs/DEPLOYMENT.md ကြည့်ပါ)

### အဆင့် ၅: BotFather မှာ Menu Button ချိတ်ပါ (optional)
1. @BotFather → `/mybots` → သင့် bot → **Bot Settings** → **Menu Button**
2. သင့် Mini App URL (HTTPS) နဲ့ label ("Open App") ထည့်ပါ

### Production အတွက် webhook (optional)
`.env` မှာ —
```
BOT_MODE=webhook
BOT_WEBHOOK_DOMAIN=https://api.yourdomain.com
PUBLIC_BACKEND_URL=https://api.yourdomain.com
```
backend start လုပ်တဲ့အခါ webhook ကို အလိုအလျောက် register လုပ်ပါတယ်။

---

## အပိုင်း ၂ — Adsterra SmartLink

### ⚠️ အရင်ဆုံး သိထားရမယ့်အချက်
Adsterra **SmartLink** က:
- rewarded video **မဟုတ်ပါ**
- server-to-server reward callback **မပေးပါ**

ဒါကြောင့် SmartLink နဲ့ content unlock လုပ်လို့ **မရပါ** (user တကယ်ကြည့်ပြီးပြီလား
server ဘက်က စစ်လို့မရလို့)။ ဒီ app မှာ SmartLink ကို **sponsored link
အဖြစ်သာ** ("Ad · does not unlock" badge နဲ့) ပြသပြီး content မဖွင့်ပေးပါ။
ဒါက သင့်လိုအပ်ချက် (fraud မဖြစ်စေရေး) အတိုင်းပါ။

### အဆင့် ၁: Adsterra ကနေ SmartLink URL ယူပါ
1. Adsterra publisher dashboard ဝင်ပါ
2. **Direct Link / SmartLink** ကို ဖန်တီး/ကူးယူပါ (ဥပမာ
   `https://www.effectivegatetocontent.com/xxxxxxxx`)

### အဆင့် ၂: Admin Panel မှာ ထည့်ပါ
1. `http://localhost:5173/admin/login` ဝင်ပါ
   (username/password = backend `.env` ထဲက `ADMIN_USERNAME`/`ADMIN_PASSWORD`)
2. **Settings** tab → **Adsterra SmartLink (sponsored)**
3. `SmartLink URL` မှာ သင့် link ထည့်ပါ
4. `Link label` မှာ "Sponsored" (သို့) ကြိုက်တဲ့စာ ထည့်ပါ
5. **Save settings** နှိပ်ပါ

### ရလဒ် (Settings → sponsored link)
locked content detail page ရဲ့ unlock sheet အောက်ခြေမှာ "Visit sponsor"
ခလုတ် ပေါ်လာမယ်။ user နှိပ်ရင် SmartLink ကို ဖွင့်ပေးပြီး analytics မှာ
`smartlink_click` မှတ်တယ် — ဒါပေမယ့် **content မဖွင့်ပေးပါ**။

---

## အပိုင်း ၂ခ — SmartLink Gate (ကြော်ငြာကြည့်မှ content ဖွင့်) ⭐

သင်ရွေးခဲ့တဲ့ နည်းလမ်း (B+)။ SmartLink ကို ဖွင့်ပြီး server-side cooldown
ကျော်မှ content unlock ဖြစ်စေတယ်။

### ⚠️ သတိ (ရိုးရိုးသားသား)
ဒါဟာ **best-effort gate** ပါ — တကယ့် verified rewarded ad **မဟုတ်ပါ**။
user က link ကိုပဲ ဖွင့်ပြီး cooldown ကိုပဲ စောင့်ရုံ (ကြော်ငြာ တကယ်မကြည့်လည်းရ)
unlock ဖြစ်နိုင်တယ်။ fraud-proof မဟုတ်ပါ။ ဒါကို "verified viewing" လို့
ကြေညာလို့ မရပါ။ ဒါပေမယ့် ချက်ချင်း/bot unlock ကို လျှော့ချပေးပါတယ်။

### ဘာကြောင့် server-side ကျ fraud လျှော့သလဲ
- user ဘယ်အချိန် link ဖွင့်တယ်ဆိုတာ **server timestamp** နဲ့ မှတ်တယ်
- cooldown ကို **server ဘက်က enforce** လုပ်တယ် (client timer ကို တိုချ၍ မရ)
- session တစ်ခုက **တစ်ကြိမ်သာ** သုံးလို့ရ + nonce ledger (replay မရ)

### အဆင့် ၁: Admin → Ad Providers → smartlink → Configure
```json
{
  "url": "https://your-adsterra-smartlink/...",
  "label": "Sponsored",
  "cooldownSeconds": 15
}
```
- **Enabled** ✓
- **Rewarded** ✓  (content unlock လုပ်ခွင့်ပေးတယ်)
- Save

### အဆင့် ၂: content မှာ "Locked" ✓ ဖြစ်အောင် ထားပါ
locked content ဖွင့်ရင် unlock sheet မှာ smartlink option ပေါ်လာမယ်။

### user ဘက်က ဖြစ်စဉ်
1. "Unlock" နှိပ် → SmartLink ပွင့်
2. ပြန်လာတဲ့အခါ cooldown (ဥပမာ ၁၅ စက္ကန့်) count down ပြ
3. cooldown ကျော်တာနဲ့ server က verify → content unlock ✅

> `cooldownSeconds` ကို ကြိုက်သလို ပြောင်းလို့ရတယ် (ဥပမာ 20, 30)။

---

## အပိုင်း ၃ — တကယ် content unlock လုပ်ချင်ရင် (rewarded ad)

Content ကို ကြော်ငြာနဲ့ unlock လုပ်ချင်ရင် **server-side verification ပေးတဲ့
rewarded-ad network** တစ်ခု လိုပါတယ် (Adsterra SmartLink မဟုတ်)။ ဥပမာ —
rewarded video + S2S (server-to-server) callback ပေးတဲ့ network။

လုပ်ရမယ့်အဆင့် (docs/AD_PROVIDERS.md မှာ အသေးစိတ်) —
1. network ကနေ SDK URL + zone id + S2S secret ယူပါ
2. Admin Panel → **Ad Providers** → `generic_s2s` ကို Configure
   - `sdkUrl`, `zoneId`, `s2sSecret`, `signatureFields` ဖြည့်ပါ
   - **Enabled** ✓ + **Rewarded** ✓
3. network dashboard မှာ reward callback URL ကို အောက်ပါအတိုင်း ထည့်ပါ —
   ```
   https://api.yourdomain.com/api/ads/callback/generic_s2s
   ```
4. frontend `src/lib/adFlow.ts` ရဲ့ `showSdkRewarded()` မှာ အဲ့ network ရဲ့
   SDK ခေါ်ပုံ ရေးထည့်ပါ

> Local စမ်းဖို့အတွက် `manual` provider ပါပြီးသား (dev only, production မှာ
> အလိုအလျောက် ပိတ်)။ ဒါနဲ့ unlock flow တစ်ခုလုံး စမ်းလို့ရပါတယ်။
