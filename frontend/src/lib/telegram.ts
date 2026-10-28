/**
 * Telegram Mini App integration helpers.
 *
 * In production, the real initData string comes from window.Telegram.WebApp and
 * is sent to the backend for server-side HMAC verification. In local browser
 * development (VITE_DEV_TELEGRAM_MOCK=true) there is no Telegram runtime, so we
 * provide an empty initData — the backend will reject it (401) unless you test
 * via the real Telegram client. This is intentional: we never fake a verified
 * identity on the client.
 */

const DEV_MOCK = import.meta.env.VITE_DEV_TELEGRAM_MOCK === 'true';

export function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram(): void {
  const wa = getWebApp();
  if (wa) {
    wa.ready();
    wa.expand();
    applyTheme(wa);
  } else if (DEV_MOCK) {
    // Apply a dark default theme for browser dev.
    applyFallbackTheme();
  }
}

export function getInitData(): string {
  const wa = getWebApp();
  if (wa?.initData) return wa.initData;
  return ''; // no runtime (browser dev) -> backend will 401
}

export function isInsideTelegram(): boolean {
  return !!getWebApp()?.initData;
}

export function openExternal(url: string): void {
  const wa = getWebApp();
  if (wa?.openLink) wa.openLink(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export function haptic(type: 'success' | 'error' | 'warning' = 'success'): void {
  getWebApp()?.HapticFeedback?.notificationOccurred(type);
}

function applyTheme(wa: TelegramWebApp): void {
  const p = wa.themeParams || {};
  const root = document.documentElement;
  const set = (k: string, v?: string) => v && root.style.setProperty(k, v);
  set('--tg-bg', p.bg_color);
  set('--tg-secondary-bg', p.secondary_bg_color);
  set('--tg-text', p.text_color);
  set('--tg-hint', p.hint_color);
  set('--tg-link', p.link_color);
  set('--tg-button', p.button_color);
  set('--tg-button-text', p.button_text_color);
}

function applyFallbackTheme(): void {
  const root = document.documentElement;
  root.style.setProperty('--tg-bg', '#0f1115');
  root.style.setProperty('--tg-secondary-bg', '#1a1d24');
  root.style.setProperty('--tg-text', '#ffffff');
  root.style.setProperty('--tg-hint', '#8b95a5');
  root.style.setProperty('--tg-link', '#5ea9ff');
  root.style.setProperty('--tg-button', '#3b82f6');
  root.style.setProperty('--tg-button-text', '#ffffff');
}
