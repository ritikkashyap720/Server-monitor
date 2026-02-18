import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Lock, LogIn, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, checking } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!checking && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [checking, isAuthenticated, navigate, redirect]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <span className="inline-block w-6 h-6 border-2 border-accent/50 border-t-accent rounded-full animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-950 px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-accent/10 border border-accent/30 p-3">
            <Activity className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-200">Server Monitor</h1>
            <p className="text-xs text-slate-500">Sign in to access the dashboard</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-dark-600 bg-dark-900/90 p-6 shadow-xl"
        >
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Username</span>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-lg bg-dark-700 border border-dark-600 pl-10 pr-3 py-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  placeholder="admin"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Password</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg bg-dark-700 border border-dark-600 pl-10 pr-3 py-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  placeholder="••••••••"
                />
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent/20 text-accent border border-accent/30 py-2.5 px-4 font-medium hover:bg-accent/30 hover:text-dark-950 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Default: admin / admin. Set MONITOR_USER and MONITOR_PASSWORD on the server to change.
        </p>
      </div>
    </div>
  );
}
