/**
 * Base interface for a rewarded-ad provider.
 *
 * A provider is responsible for TWO things only:
 *  1. Describing to the client how to load/show its rewarded unit (getClientConfig).
 *  2. Verifying, SERVER-SIDE, that a reward was genuinely earned (verifyReward).
 *
 * Unlocking content is NEVER decided on the client. The server only unlocks
 * after verifyReward() returns { ok: true } for a pending ad_session, and the
 * session's nonce has not been used before.
 *
 * Add a new network by creating a subclass in ./providers and registering it
 * in ./registry.js. No other code needs to change.
 */
export class AdProvider {
  /** @param {object} cfg provider config (from ad_providers.config_json) */
  constructor(cfg = {}) {
    this.cfg = cfg;
  }

  /** Stable key, must match ad_providers.key and the registry entry. */
  static get key() {
    throw new Error('AdProvider subclass must define static key');
  }

  /** Human label shown in the UI. */
  static get label() {
    return this.key;
  }

  /** Whether this provider is allowed to unlock content (rewarded). */
  static get rewarded() {
    return true;
  }

  /**
   * Non-secret config handed to the client so it can load the SDK / unit.
   * NEVER return secrets (s2s keys, server tokens) here.
   * @param {{session: object}} ctx
   * @returns {object}
   */
  getClientConfig(/* ctx */) {
    return {};
  }

  /**
   * Verify a reward for a pending ad session.
   *
   * Implementations must perform real verification:
   *  - validate an S2S callback signature, OR
   *  - call the network's reward-status API, OR
   *  - validate a signed SSV (server-side verification) payload.
   *
   * MUST be idempotent and MUST reject replays (the caller also enforces a
   * nonce ledger, but providers should validate the nonce they receive).
   *
   * @param {object} params
   * @param {object} params.session   the ad_sessions row
   * @param {object} params.payload   data from the callback/poll
   * @returns {Promise<{ok: boolean, reason?: string, rewardAmount?: number}>}
   */
  async verifyReward(/* params */) {
    throw new Error('AdProvider subclass must implement verifyReward');
  }
}

export default AdProvider;
