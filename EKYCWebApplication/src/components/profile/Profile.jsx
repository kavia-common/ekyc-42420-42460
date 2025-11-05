import React, { useEffect, useMemo, useState } from 'react';
import RetroCard from '../common/RetroCard';
import useProfile from '../../hooks/useProfile';
import '../../styles/retro.css';
import { useNotifications } from '../../utils/notifications';

/**
 * PUBLIC_INTERFACE
 * Profile
 * Retro-themed profile page allowing users to view and update: full name, DOB, address, and phone.
 * Persists to Supabase 'profiles' table keyed by auth user id.
 */
export default function Profile() {
  const { profile, loading, saving, error, save, initialized, refresh } = useProfile();
  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    address: '',
    phone: '',
  });
  const [message, setMessage] = useState(null);
  const notify = useNotifications();

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        dob: profile.dob || '',
        address: profile.address || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const disabled = useMemo(() => loading || saving || !initialized, [loading, saving, initialized]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);

    // client-side validations
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      setMessage({ type: 'error', text: 'DOB must be YYYY-MM-DD' });
      return;
    }
    if (form.phone && !/^[\d+\-\s()]{6,20}$/.test(form.phone)) {
      setMessage({ type: 'error', text: 'Phone contains invalid characters' });
      return;
    }

    const { error: saveErr } = await save(form);
    if (saveErr) {
      setMessage({ type: 'error', text: saveErr.message || 'Failed to save profile' });
      notify.error(saveErr.message || 'Failed to save profile');
      return;
    }
    setMessage({ type: 'success', text: 'Profile updated successfully' });
    notify.success('Profile updated');
    // ensure we see latest values
    await refresh();
  }

  return (
    <div className="container">
      <RetroCard title="Your Profile" subtitle="Manage your personal information">
        {!initialized ? (
          <div>Loading profile...</div>
        ) : (
          <>
            {error && <div style={{ color: 'var(--retro-danger)', marginBottom: 8 }}>{error.message}</div>}
            {message && (
              <div
                style={{
                  color: message.type === 'error' ? 'var(--retro-danger)' : 'var(--retro-success)',
                  marginBottom: 8,
                }}
              >
                {message.text}
              </div>
            )}
            <form onSubmit={onSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Full Name</span>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Jane Doe"
                    className="retro-input"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid var(--retro-border)',
                      background: 'var(--retro-surface)',
                      color: 'var(--retro-text)',
                    }}
                    disabled={disabled}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Date of Birth</span>
                  <input
                    type="date"
                    value={form.dob || ''}
                    onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                    className="retro-input"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid var(--retro-border)',
                      background: 'var(--retro-surface)',
                      color: 'var(--retro-text)',
                    }}
                    disabled={disabled}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                  <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Address</span>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, Springfield"
                    className="retro-textarea"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid var(--retro-border)',
                      background: 'var(--retro-surface)',
                      color: 'var(--retro-text)',
                      resize: 'vertical',
                    }}
                    disabled={disabled}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555 555 5555"
                    className="retro-input"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid var(--retro-border)',
                      background: 'var(--retro-surface)',
                      color: 'var(--retro-text)',
                    }}
                    disabled={disabled}
                  />
                </label>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={disabled}
                  className="nav-link"
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => refresh()}
                  className="nav-link"
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  Refresh
                </button>
              </div>

              {loading && <div style={{ marginTop: 8, color: 'var(--retro-text-dim)' }}>Loading...</div>}
            </form>
          </>
        )}
      </RetroCard>
    </div>
  );
}
