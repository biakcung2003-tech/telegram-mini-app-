import { api } from './api';
import { openExternal } from './telegram';

/**
 * Orchestrates the client side of a rewarded-ad / gated unlock. The server
 * remains the source of truth: it issues the session + nonce, verifies, and
 * finalizes the unlock. This module only drives the provider UI and relays the
 * server-issued identifiers.
 *
 * Provider "kinds" (from provider.config.kind):
 *  - "manual":    dev-only. Echoes the nonce to /verify.
 *  - "sdk":       a real network. Loads its SDK, shows the rewarded unit, waits
 *                 for the network's S2S callback, then polls /verify.
 *  - "smartlink": best-effort gate. Opens the SmartLink, records the open
 *                 server-side, waits out a server-enforced cooldown, then
 *                 verifies. NOT a true rewarded verification (see provider).
 */

export type AdProgress =
  | { phase: 'starting' }
  | { phase: 'showing' }
  | { phase: 'cooldown'; secondsLeft: number }
  | { phase: 'verifying' }
  | { phase: 'unlocking' }
  | { phase: 'done'; expiresAt: string | null }
  | { phase: 'error'; message: string };

export async function runUnlock(
  contentId: number,
  providerKey: string,
  onProgress: (p: AdProgress) => void
): Promise<void> {
  try {
    onProgress({ phase: 'starting' });
    const session = await api.startAd(contentId, providerKey);

    onProgress({ phase: 'showing' });
    const verifyExtra = await runProvider(session, onProgress);

    onProgress({ phase: 'verifying' });
    const { grant } = await verifyWithRetry(session.sessionId, verifyExtra);

    onProgress({ phase: 'unlocking' });
    const res = await api.unlock(grant);

    onProgress({ phase: 'done', expiresAt: res.expiresAt });
  } catch (e) {
    onProgress({ phase: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
  }
}

type StartResult = Awaited<ReturnType<typeof api.startAd>>;

/**
 * Drives the provider's UI. Returns extra fields to pass to /verify (e.g. the
 * nonce for the manual/smartlink providers).
 */
async function runProvider(
  session: StartResult,
  onProgress: (p: AdProgress) => void
): Promise<Record<string, unknown>> {
  const kind = String(session.provider.config.kind || '');
  switch (kind) {
    case 'manual':
      // DEV ONLY: simulate "watching" then echo the server nonce.
      await delay(1200);
      return { nonce: session.nonce };

    case 'sdk':
      await showSdkRewarded(session);
      return {}; // reward confirmed via S2S callback -> server marks verified

    case 'smartlink':
      await runSmartlink(session, onProgress);
      return { nonce: session.nonce };

    default:
      throw new Error(`Unsupported ad provider kind: "${kind}"`);
  }
}

/**
 * SmartLink gate:
 *  1. Open the SmartLink in the external browser / Telegram.
 *  2. Tell the server the link was opened (server timestamps it).
 *  3. Count down the server-enforced cooldown in the UI.
 * The real cooldown is enforced server-side in verifyReward(), so shortening
 * the client timer does nothing.
 */
async function runSmartlink(
  session: StartResult,
  onProgress: (p: AdProgress) => void
): Promise<void> {
  const cfg = session.provider.config as { url?: string; cooldownSeconds?: number };
  if (!cfg.url) throw new Error('SmartLink URL not configured');

  // 1. Open the link.
  openExternal(cfg.url);

  // 2. Record the open server-side; use the server's cooldown value.
  const opened = await api.smartlinkOpened(session.sessionId);
  const cooldown = Math.max(0, Number(opened.cooldownSeconds ?? cfg.cooldownSeconds ?? 15));

  // 3. Count down for the UI (server still enforces the real wait).
  for (let s = cooldown; s > 0; s--) {
    onProgress({ phase: 'cooldown', secondsLeft: s });
    await delay(1000);
  }
}

/**
 * Loads a network SDK and shows its rewarded unit. Reference shape only —
 * replace with your approved network's concrete API. Do NOT resolve "reward
 * earned" on the client; let the server's S2S callback be the real gate.
 */
async function showSdkRewarded(session: StartResult): Promise<void> {
  const cfg = session.provider.config as { sdkUrl?: string; zoneId?: string };
  if (!cfg.sdkUrl) throw new Error('Provider SDK URL not configured');

  await loadScript(cfg.sdkUrl);

  throw new Error(
    'No concrete rewarded SDK wired yet. Configure an approved network in the admin panel and implement showSdkRewarded().'
  );
}

/** Poll /verify a few times to allow verification (S2S callback / cooldown). */
async function verifyWithRetry(
  sessionId: string,
  extra: Record<string, unknown>,
  attempts = 12,
  intervalMs = 1500
): Promise<{ grant: string }> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await api.verifyAd(sessionId, extra);
      if (res.grant) return { grant: res.grant };
    } catch (e) {
      lastErr = e;
    }
    await delay(intervalMs);
  }
  throw lastErr instanceof Error ? lastErr : new Error('Reward not verified in time');
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => {
      loaded.add(src);
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load ad SDK'));
    document.head.appendChild(s);
  });
}
