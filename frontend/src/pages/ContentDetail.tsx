import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { ContentItem } from '../lib/types';
import { UnlockSheet } from '../components/UnlockSheet';
import { Spinner } from '../components/Spinner';
import { BackIcon, LockIcon, PlayIcon } from '../components/Icon';

export function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .getContent(Number(id))
      .then((r) => setItem(r.item))
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-tg-hint">
        <Spinner className="text-tg-button" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-red-300">{error || 'Not found'}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-tg-link">
          Back to home
        </button>
      </div>
    );
  }

  const locked = item.isLocked && !item.unlocked;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-16">
      <div className="relative">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="h-56 w-full object-cover" />
        ) : (
          <div className="h-56 w-full bg-gradient-to-br from-tg-button/40 to-tg-secondary" />
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
          aria-label="Back"
        >
          <BackIcon width={18} height={18} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold leading-snug">{item.title}</h1>
        {item.description && (
          <p className="mt-2 text-sm text-tg-hint">{item.description}</p>
        )}
        <div className="mt-2 text-xs text-tg-hint">{item.views} views</div>

        <div className="mt-5">
          {locked ? (
            <div className="rounded-2xl border border-white/10 bg-tg-secondary p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                <LockIcon />
              </div>
              <h3 className="font-semibold">This content is locked</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-tg-hint">
                {item.unlock?.monetizationEnabled === false
                  ? 'Unlocking is temporarily disabled.'
                  : `Watch ${item.unlock?.requiredAds ?? 1} rewarded ad to unlock${
                      item.unlock && item.unlock.durationSeconds > 0
                        ? ' for a limited time'
                        : ' permanently'
                    }.`}
              </p>
              <button
                disabled={item.unlock?.monetizationEnabled === false}
                onClick={() => setShowSheet(true)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-tg-button px-5 py-3 font-semibold text-tg-buttonText transition active:scale-[0.98] disabled:opacity-50"
              >
                <PlayIcon /> Unlock now
              </button>
            </div>
          ) : (
            <article className="rounded-2xl bg-tg-secondary p-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300">
                Unlocked content
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {item.body || 'No content body.'}
              </div>
            </article>
          )}
        </div>
      </div>

      {showSheet && (
        <UnlockSheet
          item={item}
          onClose={() => setShowSheet(false)}
          onUnlocked={() => {
            // Re-fetch to get the unlocked body from the server.
            load();
            setTimeout(() => setShowSheet(false), 1200);
          }}
        />
      )}
    </div>
  );
}
