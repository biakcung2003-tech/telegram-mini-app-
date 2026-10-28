import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Category, ContentItem } from '../lib/types';
import { ContentCard, CardSkeleton } from '../components/ContentCard';
import { SearchIcon } from '../components/Icon';

export function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then((r) => setCategories(r.categories)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      api
        .listContent({ category: activeCat ?? undefined, q: q.trim() || undefined })
        .then((r) => {
          if (!cancelled) setItems(r.items);
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message || 'Failed to load');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250); // debounce search
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [activeCat, q]);

  const catTabs = useMemo(
    () => [{ id: null as number | null, name: 'All' }, ...categories.map((c) => ({ id: c.id, name: c.name }))],
    [categories]
  );

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Content Hub</h1>
        <p className="text-sm text-tg-hint">Browse and unlock premium content.</p>
      </header>

      <div className="relative mb-3">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint"
          width={18}
          height={18}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search content…"
          className="w-full rounded-xl bg-tg-secondary py-2.5 pl-10 pr-3 text-sm outline-none ring-tg-button/40 placeholder:text-tg-hint focus:ring-2"
        />
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {catTabs.map((c) => {
          const active = c.id === activeCat;
          return (
            <button
              key={String(c.id)}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-tg-button text-tg-buttonText'
                  : 'bg-tg-secondary text-tg-hint'
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/15 p-4 text-sm text-red-300">
          {error}
          <p className="mt-1 text-xs text-red-300/70">
            If you opened this outside Telegram, authentication will fail by design.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-tg-hint">No content found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
