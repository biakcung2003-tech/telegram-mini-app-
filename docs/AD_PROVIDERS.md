# Ad providers & the verified unlock flow

This project unlocks content **only after a reward is verified on the server**.
The client never decides that content is unlocked.

## The flow (end to end)

```
User taps "Unlock"           (explicit consent)
        │
        ▼
POST /api/ads/start          server creates a single-use ad_session + nonce
        │                     returns provider client config (non-secret only)
        ▼
Client shows the rewarded unit for the chosen provider
        │
        ▼
Reward earned → provider verification:
   • Preferred: the AD NETWORK calls
     POST /api/ads/callback/:providerKey   (server-to-server, signed)
   • The provider's verifyReward() validates the signature + nonce
        │
        ▼
POST /api/ads/verify         client asks server to confirm; on success the
        │                     server burns the nonce and returns a one-time
        ▼                     signed GRANT token
POST /api/ads/unlock         server validates the grant, marks the session
        │                     "consumed", and stores the unlock permission
        ▼
Content body becomes readable (served only when unlocked)
```

## Replay & fraud protections

- **Server-issued nonce** bound to each ad session.
- **Nonce ledger** (`used_nonces`): a verified nonce can never be reused, so a
  replayed network callback is rejected.
- **Single-use grant tokens**: HMAC-signed over
  `(userId, contentId, sessionId, nonce)`. The referenced session flips to
  `consumed` on unlock, so replaying a grant is idempotent (no double unlock).
- **Session TTL** (15 min) and status machine: `pending → verified → consumed`
  (or `failed`/`expired`).
- **Rate limiting** on `/api/ads/*` (stricter than the general API limiter).
- **Monetization toggle**: admins can disable unlocking globally.

## Adding a real rewarded network

1. Subclass `AdProvider` in `backend/src/ads/providers/`. Implement:
   - `getClientConfig()` → return only **non-secret** fields the client needs.
   - `verifyReward({ session, payload })` → do **real** verification (validate
     the network's signed S2S callback, or call its reward-status API). Return
     `{ ok: true, rewardAmount }` only when genuinely earned.
2. Register the class in `backend/src/ads/registry.js`.
3. In the **admin panel → Ad Providers**, configure the provider: set its
   `config` JSON (SDK URL, zone id, `s2sSecret`, documented signature fields),
   enable it, and mark it **rewarded**.
4. Implement the client display in `frontend/src/lib/adFlow.ts` →
   `showSdkRewarded()` for `kind: "sdk"`, matching your network's SDK API.

`GenericS2SProvider` is a ready template for any network that supports a signed
server-to-server reward callback.

> **Do not** ship a provider that resolves "completed" on the client without a
> real server-side check. The included `manual` provider is dev-only and is
> force-disabled when `NODE_ENV=production`.

## Adsterra SmartLink — important

Adsterra **SmartLink** is a direct-link/pop monetization product. It is **not**
a rewarded-video format and Adsterra does **not** provide a server-to-server
reward callback for SmartLinks. Therefore SmartLinks **cannot** be used to
verify an ad "completion".

In this app the SmartLink is treated strictly as an **optional, clearly labeled
sponsored link**:

- Configured in **admin → Settings** (URL + label).
- Rendered with an explicit "Ad · does not unlock" badge.
- Clicking it is logged as a `smartlink_click` analytics event only.
- Returning from the external link is **never** treated as a completed ad and
  **never** unlocks content.

If Adsterra (or another network) later provides you with an **approved rewarded
format that supports server-side verification**, implement it as a provider per
the steps above — then it can gate content.
