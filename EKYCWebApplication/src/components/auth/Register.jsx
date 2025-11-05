import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RetroCard from '../common/RetroCard';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../utils/notifications';

/**
 * PUBLIC_INTERFACE
 * Register
 * Email/password registration using Supabase, setting initial metadata.
 * Note: Confirmation email may be required depending on Supabase settings.
 */
export default function Register() {
  const { registerWithEmail, error } = useAuth();
  const notify = useNotifications();
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const { error: signUpError } = await registerWithEmail(form);
    setBusy(false);
    if (!signUpError) {
      setDone(true);
      notify.success('Account created. Check email if confirmation is required.', { duration: 4500 });
      setTimeout(() => navigate('/login', { replace: true }), 1000);
    } else {
      notify.error(signUpError.message || 'Registration failed');
    }
  }

  return (
    <div className="container">
      <RetroCard title="Create Account" subtitle="Get started with EKYC">
        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Full Name
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Jane Doe"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
              />
            </label>
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
                placeholder="Choose a strong password"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
              />
            </label>
            <button type="submit" disabled={busy} className="nav-link" style={{ width: 'fit-content', cursor: 'pointer' }}>
              {busy ? 'Creating...' : 'Register'}
            </button>
            {error && <div style={{ color: 'var(--retro-danger)' }}>{error.message}</div>}
            {done && <div style={{ color: 'var(--retro-success)' }}>Sign-up successful. Check your email if confirmation is required.</div>}
            <div style={{ marginTop: 8 }}>
              Already have an account? <Link to="/login" className="nav-link">Login</Link>
            </div>
          </div>
        </form>
      </RetroCard>
    </div>
  );
}
