import { getInitData } from './telegram';
import type { Category, ContentItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

async function request<T>(path: string, opts: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (auth) {
    headers['Authorization'] = `tma ${getInitData()}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data?.error || res.statusText, res.status, data);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ── User API ─────────────────────────────────────────────────
export const api = {
  base: API_BASE,

  categories: () => request<{ categories: Category[] }>('/api/categories'),

  listContent: (params: { category?: number; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', String(params.category));
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return request<{ items: ContentItem[] }>(`/api/content${query ? `?${query}` : ''}`);
  },

  getContent: (id: number) => request<{ item: ContentItem }>(`/api/content/${id}`),

  myUnlocks: () =>
    request<{ unlocks: { contentId: number; expiresAt: string | null }[] }>('/api/me/unlocks'),

  startAd: (contentId: number, providerKey: string) =>
    request<{
      sessionId: string;
      nonce: string;
      provider: { key: string; config: Record<string, unknown> };
      expiresAt: string;
    }>('/api/ads/start', {
      method: 'POST',
      body: JSON.stringify({ contentId, providerKey }),
    }),

  smartlinkOpened: (sessionId: string) =>
    request<{ ok: boolean; cooldownSeconds: number }>('/api/ads/smartlink-opened', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  verifyAd: (sessionId: string, extra: Record<string, unknown> = {}) =>
    request<{ ok: boolean; grant: string }>('/api/ads/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...extra }),
    }),

  unlock: (grant: string) =>
    request<{ ok: boolean; expiresAt: string | null }>('/api/ads/unlock', {
      method: 'POST',
      body: JSON.stringify({ grant }),
    }),

  trackSmartlinkClick: (contentId: number) =>
    request<{ ok: boolean }>('/api/events/smartlink-click', {
      method: 'POST',
      body: JSON.stringify({ contentId }),
    }).catch(() => undefined),
};

// ── Admin API (JWT cookie / bearer) ──────────────────────────
let adminToken: string | null = localStorage.getItem('admin_token');

function adminHeaders(): Record<string, string> {
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

async function adminRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...adminHeaders(),
    ...(opts.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: 'include' });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data?.error || res.statusText, res.status, data);
  return data as T;
}

export const adminApi = {
  get token() {
    return adminToken;
  },
  async login(username: string, password: string) {
    const data = await adminRequest<{ ok: boolean; token: string; admin: unknown }>(
      '/api/admin/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    );
    adminToken = data.token;
    localStorage.setItem('admin_token', data.token);
    return data;
  },
  logout() {
    adminToken = null;
    localStorage.removeItem('admin_token');
    return adminRequest('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
  },
  me: () => adminRequest<{ admin: { id: number; username: string } }>('/api/admin/me'),

  listContent: () => adminRequest<{ items: AdminContent[] }>('/api/admin/content'),
  createContent: (body: Partial<AdminContent>) =>
    adminRequest<{ id: number }>('/api/admin/content', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateContent: (id: number, body: Partial<AdminContent>) =>
    adminRequest('/api/admin/content/' + id, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContent: (id: number) =>
    adminRequest('/api/admin/content/' + id, { method: 'DELETE' }),

  listCategories: () => adminRequest<{ categories: AdminCategory[] }>('/api/admin/categories'),
  createCategory: (slug: string, name: string, sortOrder = 0) =>
    adminRequest('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ slug, name, sortOrder }),
    }),
  deleteCategory: (id: number) =>
    adminRequest('/api/admin/categories/' + id, { method: 'DELETE' }),

  listRules: () => adminRequest<{ rules: UnlockRule[] }>('/api/admin/unlock-rules'),
  createRule: (name: string, requiredAds: number, durationSeconds: number) =>
    adminRequest('/api/admin/unlock-rules', {
      method: 'POST',
      body: JSON.stringify({ name, requiredAds, durationSeconds }),
    }),
  deleteRule: (id: number) =>
    adminRequest('/api/admin/unlock-rules/' + id, { method: 'DELETE' }),

  providers: () =>
    adminRequest<{ available: ProviderMeta[]; configured: ConfiguredProvider[] }>(
      '/api/admin/providers'
    ),
  saveProvider: (p: {
    key: string;
    label: string;
    enabled: boolean;
    rewarded: boolean;
    config: Record<string, unknown>;
  }) => adminRequest('/api/admin/providers', { method: 'POST', body: JSON.stringify(p) }),
  deleteProvider: (key: string) =>
    adminRequest('/api/admin/providers/' + key, { method: 'DELETE' }),

  settings: () => adminRequest<{ settings: Record<string, string> }>('/api/admin/settings'),
  saveSettings: (settings: Record<string, string>) =>
    adminRequest<{ settings: Record<string, string> }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  analytics: () => adminRequest<Analytics>('/api/admin/analytics'),

  async uploadThumbnail(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers: adminHeaders(), // do NOT set Content-Type; browser sets multipart boundary
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.error || 'upload failed', res.status, data);
    return data.url as string;
  },
};

// ── Admin types ──────────────────────────────────────────────
export interface AdminContent {
  id: number;
  title: string;
  description: string;
  body: string;
  thumbnail_url: string;
  thumbnailUrl?: string;
  category_id: number | null;
  categoryId?: number | null;
  is_locked: number;
  isLocked?: boolean;
  is_published: number;
  isPublished?: boolean;
  unlock_rule_id: number | null;
  unlockRuleId?: number | null;
  views: number;
  unlocks: number;
}
export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
}
export interface UnlockRule {
  id: number;
  name: string;
  required_ads: number;
  duration_seconds: number;
}
export interface ProviderMeta {
  key: string;
  label: string;
  rewarded: boolean;
}
export interface ConfiguredProvider {
  id: number;
  key: string;
  label: string;
  enabled: boolean;
  rewarded: boolean;
  config: Record<string, unknown>;
}
export interface Analytics {
  totals: {
    users: number;
    content: number;
    unlocks: number;
    views: number;
    adVerified: number;
    smartlinkClicks: number;
  };
  byType: { type: string; c: number }[];
  topContent: { id: number; title: string; views: number; unlocks: number }[];
  last7: { d: string; c: number }[];
}
