import { useEffect, useState } from 'react';
import { adminApi, type Analytics } from '../../../lib/api';
import { Spinner } from '../../../components/Spinner';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-tg-secondary p-4">
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-tg-hint">{label}</div>
    </div>
  );
}

export function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.analytics().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <Spinner />;

  const max7 = Math.max(1, ...data.last7.map((d) => d.c));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Users" value={data.totals.users} />
        <Stat label="Content" value={data.totals.content} />
        <Stat label="Unlocks" value={data.totals.unlocks} />
        <Stat label="Views" value={data.totals.views} />
        <Stat label="Ads verified" value={data.totals.adVerified} />
        <Stat label="Sponsored clicks" value={data.totals.smartlinkClicks} />
      </div>

      <section className="rounded-xl bg-tg-secondary p-4">
        <h3 className="mb-3 text-sm font-semibold">Activity (last 7 days)</h3>
        {data.last7.length === 0 ? (
          <p className="text-sm text-tg-hint">No activity yet.</p>
        ) : (
          <div className="flex h-32 items-end gap-2">
            {data.last7.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-tg-button/70"
                  style={{ height: `${(d.c / max7) * 100}%`, minHeight: 4 }}
                  title={`${d.d}: ${d.c}`}
                />
                <span className="text-[9px] text-tg-hint">{d.d.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-tg-secondary p-4">
        <h3 className="mb-3 text-sm font-semibold">Top content</h3>
        <div className="space-y-2">
          {data.topContent.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2">{c.title}</span>
              <span className="shrink-0 text-tg-hint">
                {c.views} views · {c.unlocks} unlocks
              </span>
            </div>
          ))}
          {data.topContent.length === 0 && (
            <p className="text-sm text-tg-hint">No content yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
