import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Spinner } from '../../components/Spinner';

export function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.login(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-tg-secondary p-6 shadow-card"
      >
        <h1 className="text-lg font-bold">Admin sign in</h1>
        <p className="mb-5 text-sm text-tg-hint">Manage content, providers and settings.</p>

        <label className="mb-1 block text-xs text-tg-hint">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mb-3 w-full rounded-xl bg-black/20 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button/50"
        />

        <label className="mb-1 block text-xs text-tg-hint">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-xl bg-black/20 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button/50"
        />

        {error && <div className="mb-3 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</div>}

        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-button py-2.5 font-semibold text-tg-buttonText disabled:opacity-60"
        >
          {loading && <Spinner />} Sign in
        </button>
      </form>
    </div>
  );
}
