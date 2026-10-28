import { AdProvider } from '../AdProvider.js';
import { hmac, safeEqualHex } from '../../lib/crypto.js';

/**
 * GenericS2SProvider — a reusable template for ANY rewarded-ad network that
 * supports Server-Side Verification (SSV) / server-to-server reward callbacks.
 *
 * How it works:
 *  1. The client loads the network's rewarded unit using getClientConfig().
 *  2. When the user finishes watching, the NETWORK (not the client) calls your
 *     callback URL:  POST {PUBLIC_BACKEND_URL}/api/ads/callback/{providerKey}
 *     with at least: { sessionId, nonce, signature, rewardAmount }.
 *  3. verifyReward() recomputes the signature using the shared secret and the
 *     exact field order the network documents, then compares in constant time.
 *
 * Configure (admin panel -> ad provider config_json):
 *   {
 *     "sdkUrl": "https://network.example/sdk.js",
 *     "zoneId": "123456",
 *     "s2sSecret": "....",             // shared secret, NEVER sent to client
 *     "signatureFields": ["sessionId","nonce","rewardAmount"]  // order matters
 *   }
 *
 * Adapt `verifyReward` to match your network's documented signing scheme.
 */
export class GenericS2SProvider extends AdProvider {
  static get key() {
    return 'generic_s2s';
  }
  static get label() {
    return 'Rewarded network (server-to-server verified)';
  }
  static get rewarded() {
    return true;
  }

  getClientConfig() {
    // Only non-secret fields are exposed to the client.
    return {
      kind: 'sdk',
      sdkUrl: this.cfg.sdkUrl || '',
      zoneId: this.cfg.zoneId || '',
    };
  }

  async verifyReward({ session, payload }) {
    const secret = this.cfg.s2sSecret;
    if (!secret) return { ok: false, reason: 'provider missing s2sSecret' };
    if (!payload) return { ok: false, reason: 'no callback payload' };

    // Bind to the exact pending session + nonce.
    if (payload.sessionId !== session.id) {
      return { ok: false, reason: 'session mismatch' };
    }
    if (payload.nonce !== session.nonce) {
      return { ok: false, reason: 'nonce mismatch' };
    }

    // Recompute the signature from the documented field order.
    const fields = Array.isArray(this.cfg.signatureFields)
      ? this.cfg.signatureFields
      : ['sessionId', 'nonce', 'rewardAmount'];
    const base = fields.map((f) => `${f}=${payload[f] ?? ''}`).join('&');
    const expected = hmac(secret, base);

    if (!payload.signature || !safeEqualHex(payload.signature, expected)) {
      return { ok: false, reason: 'bad signature' };
    }

    const rewardAmount = Number(payload.rewardAmount || 1);
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      return { ok: false, reason: 'invalid reward amount' };
    }

    return { ok: true, rewardAmount };
  }
}

export default GenericS2SProvider;
