import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/retro.css';
import RetroCard from '../common/RetroCard';
import StatusBadge from '../common/StatusBadge';
import useKYC from '../../hooks/useKYC';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * KYCForm
 * Retro-themed KYC submission form with client-side validation.
 * On submit, persists a new row in 'kyc_submissions' with status 'pending' for the current user.
 */
export default function KYCForm() {
  const { user } = useAuth();
  const { createSubmission, fetchMySubmissions, submissions, loading, error } = useKYC();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    address: '',
    document_type: 'passport',
    document_number: '',
  });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMySubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const disabled = useMemo(() => busy || loading, [busy, loading]);

  function validate() {
    if (!form.first_name.trim()) {
      return 'First name is required';
    }
    if (!form.last_name.trim()) {
      return 'Last name is required';
    }
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      return 'DOB must be YYYY-MM-DD';
    }
    if (!form.address.trim()) {
      return 'Address is required';
    }
    if (!form.document_type.trim()) {
      return 'Document type is required';
    }
    if (!form.document_number.trim()) {
      return 'Document number is required';
    }
    if (form.document_number.length < 4) {
      return 'Document number seems too short';
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);
    const v = validate();
    if (v) {
      setMessage({ type: 'error', text: v });
      return;
    }
    setBusy(true);
    const { error: saveErr } = await createSubmission({
      first_name: form.first_name,
      last_name: form.last_name,
      dob: form.dob || null,
      address: form.address,
      document_type: form.document_type,
      document_number: form.document_number,
    });
    setBusy(false);
    if (saveErr) {
      setMessage({ type: 'error', text: saveErr.message || 'Failed to save submission' });
      return;
    }
    setMessage({ type: 'success', text: 'Submission sent. Status is now PENDING.' });
    setForm({
      first_name: '',
      last_name: '',
      dob: '',
      address: '',
      document_type: 'passport',
      document_number: '',
    });
    await fetchMySubmissions();
    // Guide user to upload step
    setTimeout(() => navigate('/kyc/upload'), 600);
  }

  return (
    <div className="container">
      <RetroCard title="KYC Submission" subtitle="Provide your details for verification">
        {error && <div style={{ color: 'var(--retro-danger)', marginBottom: 10 }}>{error.message}</div>}
        {message && (
          <div
            style={{
              color: message.type === 'error' ? 'var(--retro-danger)' : 'var(--retro-success)',
              marginBottom: 10,
            }}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>First Name</span>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="Jane"
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
                required
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Last Name</span>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Doe"
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
                required
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

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Document Type</span>
              <select
                value={form.document_type}
                onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
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
                required
              >
                <option value="passport">Passport</option>
                <option value="driver_license">Driver License</option>
                <option value="national_id">National ID</option>
              </select>
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
                required
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Document Number</span>
              <input
                type="text"
                value={form.document_number}
                onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))}
                placeholder="ABC123456"
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
                required
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
              {busy ? 'Submitting...' : 'Submit'}
            </button>
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/kyc/upload')}
                className="nav-link"
                style={{ cursor: 'pointer' }}
              >
                Upload Documents
              </button>
            )}
          </div>
        </form>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>Your Recent Submissions</h3>
          {loading && <div style={{ color: 'var(--retro-text-dim)' }}>Loading...</div>}
          {!loading && submissions.length === 0 && (
            <div style={{ color: 'var(--retro-text-dim)' }}>No submissions yet.</div>
          )}
          {!loading &&
            submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--retro-border)',
                  background: 'var(--retro-surface)',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ color: 'var(--retro-text)' }}>
                    {s.first_name} {s.last_name} — {s.document_type}
                  </strong>
                  <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                    #{s.id.slice(0, 8)} • {s.document_number}
                  </span>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
        </div>
      </RetroCard>
    </div>
  );
}
