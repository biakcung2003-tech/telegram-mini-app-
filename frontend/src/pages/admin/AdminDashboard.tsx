import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Spinner } from '../../components/Spinner';
import { ContentManager } from './sections/ContentManager';
import { ProvidersManager } from './sections/ProvidersManager';
import { RulesCategories } from './sections/RulesCategories';
import { SettingsPanel } from './sections/SettingsPanel';
import { AnalyticsPanel } from './sections/AnalyticsPanel';

type Tab = 'content' | 'providers' | 'rules' | 'settings' | 'analytics';

const TABS: { key: Tab; label: string }[] = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'content', label: 'Content' },
  { key: 'rules', label: 'Rules & Categories' },
  { key: 'providers', label: 'Ad Providers' },
  { key: 'settings', label: 'Settings' },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('analytics');
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    adminApi
      .me()
      .then((r) => {
        setUsername(r.admin.username);
        setAuthed(true);
      })
      .catch(() => {
        setAuthed(false);
        navigate('/admin/login');
      });
  }, [navigate]);

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-tg-hint">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 pb-16 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-tg-hint">Signed in as {username}</p>
        </div>
        <button
          onClick={async () => {
            await adminApi.logout();
            navigate('/admin/login');
          }}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-tg-hint"
        >
          Log out
        </button>
      </header>

      <nav className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-tg-button text-tg-buttonText' : 'bg-tg-secondary text-tg-hint'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'analytics' && <AnalyticsPanel />}
      {tab === 'content' && <ContentManager />}
      {tab === 'rules' && <RulesCategories />}
      {tab === 'providers' && <ProvidersManager />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}
