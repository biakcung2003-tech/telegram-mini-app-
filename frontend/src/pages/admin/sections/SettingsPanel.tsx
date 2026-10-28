import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/api';
import { Spinner } from '../../../components/Spinner';
import { CheckIcon } from '../../../components/Icon';

export function SettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .settings()
      .then((r) => setSettings(r.settings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await adminApi.saveSettings({
        monetization_enabled: settings.monetization_enabled ?? 'true',
        smartlink_url: settings.smartlink_url ?? '',
        smartlink_label: settings.smartlink_label ?? 'Sponsored',
      });
      setSettings(r.settings);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const monetizationOn = settings.monetization_enabled === 'true';

  return (
    <div className="max-w-xl space-y-5">
      {error && <div className="rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</div>}

      <section className="rounded-xl bg-tg-secondary p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Monetization</h2>
            <p className="text-xs text-tg-hint">
              When off, locked content cannot be unlocked and ads are not offered.
            </p>
          </div>
          <button
            onClick={() => set('monetization_enabled', monetizationOn ? 'false' : 'true')}
            className={`relative h-7 w-12 rounded-full transition ${
              monetizationOn ? 'bg-emerald-500' : 'bg-white/20'
            }`}
            aria-pressed={monetizationOn}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                monetizationOn ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-tg-secondary p-4">
        <h2 className="mb-1 text-sm font-semibold">Adsterra SmartLink (sponsored)</h2>
        <p className="mb-3 text-xs leading-relaxed text-tg-hint">
          Shown as an <b>optional, clearly labeled sponsored link</b>. It does{' '}
          <b>not</b> unlock content and clicking it is never treated as an ad
          completion.
        </p>

        <label className="mb-1 block text-xs text-tg-hint">SmartLink URL</label>
        <input
          value={settings.smartlink_url ?? ''}
          onChange={(e) => set('smartlink_url', e.target.value)}
          placeholder="https://your-smartlink.example/..."
          className={input}
        />

        <label className="mb-1 mt-3 block text-xs text-tg-hint">Link label</label>
        <input
          value={settings.smartlink_label ?? 'Sponsored'}
          onChange={(e) => set('smartlink_label', e.target.value)}
          placeholder="Sponsored"
          className={input}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          disabled={saving}
          onClick={save}
          className="flex items-center justify-center gap-2 rounded-xl bg-tg-button px-6 py-2.5 font-semibold text-tg-buttonText disabled:opacity-50"
        >
          {saving && <Spinner />} Save settings
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-300">
            <CheckIcon width={16} height={16} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

const input =
  'w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-tg-button/50';
