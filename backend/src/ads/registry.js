import db from '../db/index.js';
import config from '../config.js';
import { ManualProvider } from './providers/ManualProvider.js';
import { GenericS2SProvider } from './providers/GenericS2SProvider.js';
import { SmartLinkProvider } from './providers/SmartLinkProvider.js';

/**
 * Register provider classes here. Adding a network = one import + one entry.
 */
const PROVIDER_CLASSES = {
  [ManualProvider.key]: ManualProvider,
  [GenericS2SProvider.key]: GenericS2SProvider,
  [SmartLinkProvider.key]: SmartLinkProvider,
};

/** All provider class keys known to the code. */
export function knownProviderKeys() {
  return Object.keys(PROVIDER_CLASSES);
}

/** Describe providers for the admin UI (static metadata). */
export function describeProviders() {
  return Object.values(PROVIDER_CLASSES).map((C) => ({
    key: C.key,
    label: C.label,
    rewarded: C.rewarded,
  }));
}

/**
 * Build a live provider instance for a given key, pulling its config from the
 * ad_providers table. Returns null if unknown or not enabled.
 *
 * Enabling rules:
 *  - Provider row must exist AND be enabled in DB, OR
 *  - be present in ENABLED_AD_PROVIDERS env (used to bootstrap "manual" in dev).
 */
export function getProvider(key) {
  const Cls = PROVIDER_CLASSES[key];
  if (!Cls) return null;

  // Production guard: never instantiate the manual provider in prod.
  if (config.isProd && key === 'manual') return null;

  const row = db.prepare('SELECT * FROM ad_providers WHERE key = ?').get(key);
  const envEnabled = config.ads.enabledProviders.includes(key);
  const dbEnabled = row ? row.enabled === 1 : false;

  if (!dbEnabled && !envEnabled) return null;

  let cfg = {};
  if (row?.config_json) {
    try {
      cfg = JSON.parse(row.config_json);
    } catch {
      cfg = {};
    }
  }
  return new Cls(cfg);
}

/** List providers currently usable to unlock content (rewarded + enabled). */
export function listActiveRewardedProviders() {
  const out = [];
  for (const Cls of Object.values(PROVIDER_CLASSES)) {
    if (!Cls.rewarded) continue;
    const provider = getProvider(Cls.key);
    if (provider) {
      out.push({ key: Cls.key, label: Cls.label });
    }
  }
  return out;
}
