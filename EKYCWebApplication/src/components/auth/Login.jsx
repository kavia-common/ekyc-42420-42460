import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import RetroCard from '../common/RetroCard';
import { useAuth } from '../../hooks/useAuth';

/**
 * PUBLIC_INTERFACE
 * Login
 * Email/password login using Supabase auth via useAuth.
 */
export default function Login() {
  const { signInWithPassword, isAuthenticated, error, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const { error: signInError } = await signInWithPassword(form);
    setBusy(false);
    if (!signInError) {
      navigate(from, { replace: true });
    }
  }

  if (isAuthenticated) {
    // Already logged in, navigate away
    navigate(from, { replace: true });
    return null;
  }

  return (
    <div className="container">
      <RetroCard title="Login" subtitle="Access your EKYC account">
        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
              />
            </label>
            <button type="submit" disabled={busy || loading} className="nav-link" style={{ width: 'fit-content', cursor: 'pointer' }}>
              {busy || loading ? 'Signing in...' : 'Sign In'}
            </button>
            {error && <div style={{ color: 'var(--retro-danger)' }}>{error.message}</div>}
            <div style={{ marginTop: 8 }}>
              No account? <Link to="/register" className="nav-link">Register</Link>
            </div>
          </div>
        </form>
      </RetroCard>
    </div>
  );
}
