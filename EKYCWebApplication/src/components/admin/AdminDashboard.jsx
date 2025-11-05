import React, { useEffect, useMemo } from 'react';
import '../../styles/retro.css';
import RetroCard from '../common/RetroCard';
import StatusBadge from '../common/StatusBadge';
import { Link } from 'react-router-dom';
import useAdmin from '../../hooks/useAdmin';
import { useNotifications } from '../../utils/notifications';

/**
 * PUBLIC_INTERFACE
 * AdminDashboard
 * Admin list view of KYC submissions with filters and pagination.
 */
export default function AdminDashboard() {
  const {
    submissions,
    loading,
    error,
    page,
    pageSize,
    total,
    filters,
    setPage,
    setStatusFilter,
    setDocTypeFilter,
    setSearchFilter,
  } = useAdmin();

  const notify = useNotifications();

  useEffect(() => {
    if (error) {
      notify.error(error.message || 'Failed to fetch submissions');
    }
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));
  }, [total, pageSize]);

  return (
    <div className="container">
      <RetroCard title="Admin Dashboard" subtitle="Review and manage KYC submissions">
        {error && <div style={{ color: 'var(--retro-danger)', marginBottom: 8 }}>{error.message}</div>}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Status</span>
            <select
              value={filters.status}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="retro-input"
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Document Type</span>
            <select
              value={filters.docType}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="retro-input"
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
            >
              <option value="all">All</option>
              <option value="passport">Passport</option>
              <option value="driver_license">Driver License</option>
              <option value="national_id">National ID</option>
              <option value="proof_of_address">Proof of Address</option>
              <option value="selfie">Selfie</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Search</span>
            <input
              type="text"
              placeholder="Name or Document #"
              value={filters.search}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="retro-input"
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--retro-border)', background: 'var(--retro-surface)', color: 'var(--retro-text)' }}
            />
          </label>
        </div>

        <div>
          {loading && <div style={{ color: 'var(--retro-text-dim)' }}>Loading...</div>}
          {!loading && submissions.length === 0 && (
            <div style={{ color: 'var(--retro-text-dim)' }}>No submissions found.</div>
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
                    #{s.id?.slice(0, 8)} • {s.document_number} • {new Date(s.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={s.status} />
                  <Link to={`/admin/review/${s.id}`} className="nav-link">
                    Review
                  </Link>
                </div>
              </div>
            ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <button
            className="nav-link"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            style={{ cursor: page <= 1 || loading ? 'not-allowed' : 'pointer' }}
            type="button"
          >
            Prev
          </button>
          <span style={{ color: 'var(--retro-text-dim)' }}>
            Page {page} / {totalPages}
          </span>
          <button
            className="nav-link"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            style={{ cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer' }}
            type="button"
          >
            Next
          </button>
        </div>
      </RetroCard>
    </div>
  );
}
