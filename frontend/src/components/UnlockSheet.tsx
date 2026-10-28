import { useState } from 'react';
import type { ContentItem } from '../lib/types';
import { runUnlock, type AdProgress } from '../lib/adFlow';
import { api } from '../lib/api';
import { openExternal, haptic } from '../lib/telegram';
import { Spinner } from './Spinner';
import { PlayIcon, ExternalIcon, CheckIcon, LockIcon } from './Icon';

interface Props {
  item: ContentItem;
  onClose: () => void;
  onUnlocked: () => void;
}

function progressText(p: AdProgress): string {
  switch (p.phase) {
    case 'starting':
      return 'Preparing…';
    case 'showing':
      return 'Opening…';
    case 'cooldown':
      return `Please wait ${p.secondsLeft}s…`;
    case 'verifying':
      return 'Verifying…';
    case 'unlocking':
      return 'Unlocking…';
    default:
      return '';
  }
}

export function UnlockSheet({ item, onClose, onUnlocked }: Props) {
  const [progress, setProgress] = useState<AdProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unlock = item.unlock;

  const busy =
    progress != null && !['done', 'error'].includes(progress.phase);

  async function handleWatch(providerKey: string) {
    setError(null);
    await runUnlock(item.id, providerKey, (p) => {
      setProgress(p);
      if (p.phase === 'error') {
        setError(p.message);
        haptic('error');
      }
      if (p.phase === 'done') {
        haptic('success');
        onUnlocked();
      }
    });
  }

  function handleSponsored(url: string) {
    api.trackSmartlinkClick(item.id);
    openExternal(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-tg-secondary p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <LockIcon />
          </div>
          <div>
            <h2 className="text-base font-semibold">Unlock this content</h2>
            <p className="text-xs text-tg-hint">
              Watch a short rewarded ad to unlock access.
            </p>
          </div>
        </div>

        {unlock && unlock.providers.length > 0 ? (
          <div className="space-y-2">
            {unlock.providers.map((p) => (
              <button
                key={p.key}
                disabled={busy}
                onClick={() => handleWatch(p.key)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-button py-3 font-semibold text-tg-buttonText transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner /> : <PlayIcon />}
                {busy ? progressText(progress!) : `Watch rewarded ad`}
              </button>
            ))}
            <p className="px-1 pt-1 text-center text-[11px] leading-relaxed text-tg-hint">
              Rewarded advertisement. Completion is verified on our server before
              content is unlocked.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 p-4 text-center text-sm text-tg-hint">
            Unlocking is temporarily unavailable. Please check back later.
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {progress?.phase === 'done' && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-300">
            <CheckIcon /> Unlocked! Enjoy your content.
          </div>
        )}

        {/* Sponsored SmartLink — clearly labeled, NEVER unlocks content. */}
        {item.sponsored && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-tg-hint">
                {item.sponsored.label}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-tg-hint">
                Ad · does not unlock
              </span>
            </div>
            <button
              onClick={() => handleSponsored(item.sponsored!.url)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm text-tg-text transition active:scale-[0.98]"
            >
              <ExternalIcon width={16} height={16} />
              Visit sponsor
            </button>
          </div>
        )}

        <button
          disabled={busy}
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm text-tg-hint disabled:opacity-50"
        >
          {progress?.phase === 'done' ? 'Close' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
