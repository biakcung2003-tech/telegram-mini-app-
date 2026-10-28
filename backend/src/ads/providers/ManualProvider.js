import { AdProvider } from '../AdProvider.js';
import config from '../../config.js';

/**
 * ManualProvider — DEVELOPMENT ONLY.
 *
 * This is the only provider that can "complete" without a real ad network.
 * It exists so you can exercise the full unlock pipeline locally. It is
 * force-disabled in production by config.js (ENABLED_AD_PROVIDERS filtering)
 * AND by the explicit guard below. Do NOT use it to fake completions in prod.
 */
export class ManualProvider extends AdProvider {
  static get key() {
    return 'manual';
  }
  static get label() {
    return 'Manual (dev/testing only)';
  }
  static get rewarded() {
    return true;
  }

  getClientConfig() {
    return {
      kind: 'manual',
      notice:
        'Development provider. In production, replace with a verified rewarded-ad network.',
    };
  }

  async verifyReward({ session, payload }) {
    if (config.isProd) {
      return { ok: false, reason: 'manual provider disabled in production' };
    }
    // Require the client to echo the exact server-issued nonce. This still
    // exercises nonce-binding and replay protection in development.
    if (!payload || payload.nonce !== session.nonce) {
      return { ok: false, reason: 'nonce mismatch' };
    }
    return { ok: true, rewardAmount: 1 };
  }
}

export default ManualProvider;
