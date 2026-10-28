import { useEffect, useState } from 'react';
import {
  adminApi,
  type ProviderMeta,
  type ConfiguredProvider,
} from '../../../lib/api';
import { Spinner } from '../../../components/Spinner';

interface EditState {
  key: string;
  label: string;
  enabled: boolean;
  rewarded: boolean;
  configText: string;
}

export function ProvidersManager() {
  const [available, setAvailable] = useState<ProviderMeta[]>([]);
  const [configured, setConfigured] = useState<ConfiguredProvider[]>([]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await adminApi.providers();
      setAvailable(r.available);
      setConfigured(r.configured);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(key: string) {
    const meta = available.find((a) => a.key === key);
    const existing = configured.find((c) => c.key === key);
    setError(null);
    setEdit({
      key,
      label: existing?.label || meta?.label || key,
      enabled: existing?.enabled ?? false,
      rewarded: existing?.rewarded ?? meta?.rewarded ?? true,
      configText: JSON.stringify(existing?.config ?? defaultConfigFor(key), null, 2),
    });
  }

  async function save() {
    if (!edit) return;
    setSaving(true);
    setError(null);
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(edit.configText || '{}');
    } catch {
      setError('Config is not valid JSON');
      setSaving(false);
      return;
    }
    try {
      await adminApi.saveProvider({
        key: edit.key,
        label: edit.label,
        enabled: edit.enabled,
        rewarded: edit.rewarded,
        config,
      });
      setEdit(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(key: string) {
    if (!confirm(`Remove provider "${key}"?`)) return;
    await adminApi.deleteProvider(key);
    await refresh();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
        Only enable providers that explicitly permit <b>rewarded viewing for content access</b>.
        Each rewarded provider must verify completion server-side (S2S callback or
        reward API). The <code>manual</code> provider is for development only and is
        disabled automatically in production.
        <br />
        <br />
        <b>smartlink</b> is a <b>best-effort gate</b>: it opens your Adsterra
        SmartLink and enforces a server-side cooldown before unlocking. It is{' '}
        <b>not</b> a verified rewarded ad (Adsterra provides no completion
        callback for SmartLinks), so it can be bypassed and must not be
        advertised as verified viewing.
      </div>

      {error && <div className="rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</div>}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Available providers</h2>
        <div className="space-y-2">
          {available.map((a) => {
            const existing = configured.find((c) => c.key === a.key);
            return (
              <div
                key={a.key}
                className="flex items-center gap-3 rounded-xl bg-tg-secondary p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-tg-hint">
                    <span>key: {a.key}</span>
                    {a.rewarded && <span className="text-emerald-300">rewarded</span>}
                    {existing?.enabled ? (
                      <span className="text-emerald-300">● enabled</span>
                    ) : (
                      <span className="text-tg-hint">○ disabled</span>
                    )}
                  </div>
                </div>
                <button onClick={() => startEdit(a.key)} className="text-sm text-tg-link">
                  Configure
                </button>
                {existing && (
                  <button onClick={() => remove(a.key)} className="text-sm text-red-300">
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEdit(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-tg-secondary p-5">
            <h3 className="mb-4 font-semibold">Configure: {edit.key}</h3>

            <label className="mb-1 block text-xs text-tg-hint">Label</label>
            <input
              value={edit.label}
              onChange={(e) => setEdit({ ...edit, label: e.target.value })}
              className={input}
            />

            <div className="my-3 flex gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.enabled}
                  onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.rewarded}
                  onChange={(e) => setEdit({ ...edit, rewarded: e.target.checked })}
                />
                Rewarded (can unlock content)
              </label>
            </div>

            <label className="mb-1 block text-xs text-tg-hint">
              Config (JSON) — secrets like <code>s2sSecret</code> stay server-side
            </label>
            <textarea
              value={edit.configText}
              onChange={(e) => setEdit({ ...edit, configText: e.target.value })}
              rows={10}
              spellCheck={false}
              className={`${input} font-mono text-xs`}
            />

            <div className="mt-4 flex gap-2">
              <button
                disabled={saving}
                onClick={save}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tg-button py-2.5 font-semibold text-tg-buttonText disabled:opacity-50"
              >
                {saving && <Spinner />} Save
              </button>
              <button
                onClick={() => setEdit(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const input =
  'w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tg-button/50';

function defaultConfigFor(key: string): Record<string, unknown> {
  if (key === 'generic_s2s') {
    return {
      sdkUrl: 'https://your-network.example/sdk.js',
      zoneId: '',
      s2sSecret: '',
      signatureFields: ['sessionId', 'nonce', 'rewardAmount'],
    };
  }
  if (key === 'smartlink') {
    return {
      url: 'https://your-adsterra-smartlink/...',
      label: 'Sponsored',
      cooldownSeconds: 15,
    };
  }
  return {};
}
