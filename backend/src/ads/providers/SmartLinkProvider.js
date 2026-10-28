import { AdProvider } from '../AdProvider.js';

/**
 * SmartLinkProvider — "SmartLink gate" with a server-enforced cooldown.
 *
 * ⚠️ IMPORTANT / HONEST DISCLOSURE
 * A SmartLink (e.g. Adsterra) is NOT a rewarded-ad format and offers no
 * server-to-server completion signal. This provider therefore CANNOT truly
 * verify that an advertisement was watched. What it enforces is a weaker,
 * best-effort gate:
 *   1. the user must open the SmartLink (recorded server-side as `opened_at`), and
 *   2. at least `cooldownSeconds` must elapse between opening and verifying.
 *
 * This reduces trivial/bot unlocking but is NOT fraud-proof and must NOT be
 * advertised as "verified rewarded viewing". Use a real rewarded network with
 * S2S verification (see GenericS2SProvider) when you need genuine proof.
 *
 * Config (admin → Ad Providers → smartlink):
 *   {
 *     "url": "https://your-adsterra-smartlink/...",
 *     "label": "Sponsored",
 *     "cooldownSeconds": 15
 *   }
 */
export class SmartLinkProvider extends AdProvider {
  static get key() {
    return 'smartlink';
  }
  static get label() {
    return 'Adsterra SmartLink (gated, best-effort)';
  }
  static get rewarded() {
    // May gate content, but it is explicitly best-effort (see disclosure above).
    return true;
  }

  get cooldownSeconds() {
    const n = Number(this.cfg.cooldownSeconds);
    return Number.isFinite(n) && n >= 0 ? n : 15;
  }

  getClientConfig() {
    return {
      kind: 'smartlink',
      url: this.cfg.url || '',
      label: this.cfg.label || 'Sponsored',
      cooldownSeconds: this.cooldownSeconds,
    };
  }

  /**
   * Verify the gate. The caller passes the session row (which includes our
   * server-recorded `opened_at`) and the client's nonce echo.
   */
  async verifyReward({ session, payload }) {
    if (!this.cfg.url) {
      return { ok: false, reason: 'SmartLink URL not configured' };
    }
    if (!payload || payload.nonce !== session.nonce) {
      return { ok: false, reason: 'nonce mismatch' };
    }
    if (!session.opened_at) {
      return { ok: false, reason: 'link was not opened' };
    }
    const openedMs = new Date(session.opened_at).getTime();
    const elapsed = (Date.now() - openedMs) / 1000;
    if (elapsed < this.cooldownSeconds) {
      // Not an outright failure — the user just needs to wait longer. Mark it
      // retryable so the session stays pending and can be verified later.
      return {
        ok: false,
        retryable: true,
        reason: `please wait ${Math.ceil(this.cooldownSeconds - elapsed)}s`,
      };
    }
    return { ok: true, rewardAmount: 1 };
  }
}

export default SmartLinkProvider;
