import { useEffect, useState } from 'react';
import { adminApi, type UnlockRule, type AdminCategory } from '../../../lib/api';
import { Spinner } from '../../../components/Spinner';

export function RulesCategories() {
  const [rules, setRules] = useState<UnlockRule[]>([]);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // rule form
  const [ruleName, setRuleName] = useState('');
  const [requiredAds, setRequiredAds] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // category form
  const [catSlug, setCatSlug] = useState('');
  const [catName, setCatName] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([adminApi.listRules(), adminApi.listCategories()]);
      setRules(r.rules);
      setCats(c.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addRule() {
    if (!ruleName.trim()) return;
    await adminApi.createRule(ruleName.trim(), requiredAds, durationSeconds);
    setRuleName('');
    setRequiredAds(1);
    setDurationSeconds(0);
    await refresh();
  }

  async function addCat() {
    if (!catSlug.trim() || !catName.trim()) return;
    try {
      await adminApi.createCategory(catSlug.trim(), catName.trim());
      setCatSlug('');
      setCatName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed (slug must be unique)');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {error && (
        <div className="md:col-span-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Unlock rules */}
      <section className="rounded-xl bg-tg-secondary p-4">
        <h2 className="mb-3 text-sm font-semibold">Unlock rules</h2>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-black/20 p-2.5 text-sm">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-[11px] text-tg-hint">
                  {r.required_ads} ad(s) ·{' '}
                  {r.duration_seconds > 0 ? `${r.duration_seconds}s access` : 'permanent'}
                </div>
              </div>
              <button
                onClick={async () => {
                  await adminApi.deleteRule(r.id);
                  refresh();
                }}
                className="text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-sm text-tg-hint">No rules yet.</p>}
        </div>

        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <input
            placeholder="Rule name"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            className={input}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-tg-hint">
              Required ads
              <input
                type="number"
                min={1}
                value={requiredAds}
                onChange={(e) => setRequiredAds(Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="text-xs text-tg-hint">
              Duration (sec, 0=permanent)
              <input
                type="number"
                min={0}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className={input}
              />
            </label>
          </div>
          <button onClick={addRule} className="w-full rounded-lg bg-tg-button py-2 text-sm font-semibold text-tg-buttonText">
            Add rule
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="rounded-xl bg-tg-secondary p-4">
        <h2 className="mb-3 text-sm font-semibold">Categories</h2>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/20 p-2.5 text-sm">
              <div>
                <span className="font-medium">{c.name}</span>{' '}
                <span className="text-[11px] text-tg-hint">/{c.slug}</span>
              </div>
              <button
                onClick={async () => {
                  await adminApi.deleteCategory(c.id);
                  refresh();
                }}
                className="text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
          {cats.length === 0 && <p className="text-sm text-tg-hint">No categories yet.</p>}
        </div>

        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <input
            placeholder="Name (e.g. Premium)"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            className={input}
          />
          <input
            placeholder="Slug (e.g. premium)"
            value={catSlug}
            onChange={(e) => setCatSlug(e.target.value)}
            className={input}
          />
          <button onClick={addCat} className="w-full rounded-lg bg-tg-button py-2 text-sm font-semibold text-tg-buttonText">
            Add category
          </button>
        </div>
      </section>
    </div>
  );
}

const input =
  'mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm text-tg-text outline-none focus:ring-2 focus:ring-tg-button/50';
