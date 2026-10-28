import { useEffect, useRef, useState } from 'react';
import {
  adminApi,
  type AdminContent,
  type AdminCategory,
  type UnlockRule,
} from '../../../lib/api';
import { Spinner } from '../../../components/Spinner';

interface FormState {
  id?: number;
  title: string;
  description: string;
  body: string;
  thumbnailUrl: string;
  categoryId: number | null;
  isLocked: boolean;
  isPublished: boolean;
  unlockRuleId: number | null;
}

const EMPTY: FormState = {
  title: '',
  description: '',
  body: '',
  thumbnailUrl: '',
  categoryId: null,
  isLocked: true,
  isPublished: true,
  unlockRuleId: null,
};

export function ContentManager() {
  const [items, setItems] = useState<AdminContent[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [rules, setRules] = useState<UnlockRule[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [c, cats, r] = await Promise.all([
        adminApi.listContent(),
        adminApi.listCategories(),
        adminApi.listRules(),
      ]);
      setItems(c.items);
      setCategories(cats.categories);
      setRules(r.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function edit(item: AdminContent) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      body: item.body,
      thumbnailUrl: item.thumbnail_url,
      categoryId: item.category_id,
      isLocked: item.is_locked === 1,
      isPublished: item.is_published === 1,
      unlockRuleId: item.unlock_rule_id,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        body: form.body,
        thumbnailUrl: form.thumbnailUrl,
        categoryId: form.categoryId,
        isLocked: form.isLocked,
        isPublished: form.isPublished,
        unlockRuleId: form.unlockRuleId,
      };
      if (form.id) await adminApi.updateContent(form.id, payload);
      else await adminApi.createContent(payload);
      setForm(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this content? This cannot be undone.')) return;
    await adminApi.deleteContent(id);
    await refresh();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    setError(null);
    try {
      const url = await adminApi.uploadThumbnail(file);
      setForm({ ...form, thumbnailUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Content ({items.length})</h2>
        <button
          onClick={() => setForm({ ...EMPTY })}
          className="rounded-lg bg-tg-button px-3 py-1.5 text-sm font-semibold text-tg-buttonText"
        >
          + New
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</div>}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl bg-tg-secondary p-3"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/30">
              {item.thumbnail_url && (
                <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.title}</div>
              <div className="flex gap-2 text-[11px] text-tg-hint">
                <span>{item.is_locked ? '🔒 Locked' : '🔓 Free'}</span>
                <span>{item.is_published ? 'Published' : 'Draft'}</span>
                <span>{item.views} views</span>
              </div>
            </div>
            <button onClick={() => edit(item)} className="text-sm text-tg-link">
              Edit
            </button>
            <button onClick={() => remove(item.id)} className="text-sm text-red-300">
              Delete
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-tg-hint">No content yet.</p>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setForm(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-tg-secondary p-5">
            <h3 className="mb-4 font-semibold">{form.id ? 'Edit content' : 'New content'}</h3>

            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={input}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={input}
              />
            </Field>

            <Field label="Body (unlocked payload)">
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                className={input}
              />
            </Field>

            <Field label="Thumbnail">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-black/30">
                  {form.thumbnailUrl && (
                    <img src={form.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="text-xs" />
                {uploading && <Spinner />}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={form.categoryId ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })
                  }
                  className={input}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Unlock rule">
                <select
                  value={form.unlockRuleId ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, unlockRuleId: e.target.value ? Number(e.target.value) : null })
                  }
                  className={input}
                >
                  <option value="">— Default —</option>
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="my-3 flex gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isLocked}
                  onChange={(e) => setForm({ ...form, isLocked: e.target.checked })}
                />
                Locked
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Published
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                disabled={saving || !form.title}
                onClick={save}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tg-button py-2.5 font-semibold text-tg-buttonText disabled:opacity-50"
              >
                {saving && <Spinner />} Save
              </button>
              <button
                onClick={() => setForm(null)}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs text-tg-hint">{label}</label>
      {children}
    </div>
  );
}
