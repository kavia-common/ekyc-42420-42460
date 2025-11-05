import React, { useEffect, useMemo } from 'react';
import '../../styles/retro.css';
import RetroCard from '../common/RetroCard';
import StatusBadge from '../common/StatusBadge';
import useKYC from '../../hooks/useKYC';
import { useAuth } from '../../hooks/useAuth';

/**
 * PUBLIC_INTERFACE
 * StatusTracker
 * Shows the user's most recent KYC submission with live status updates and a simple timeline.
 * Relies on useKYC's realtime subscription to reflect changes immediately.
 */
export default function StatusTracker() {
  const { user } = useAuth();
  const { submissions, loading, error, fetchMySubmissions, startRealtime, stopRealtime } = useKYC();

  useEffect(() => {
    // Ensure we have current data and realtime subscription
    fetchMySubmissions();
    startRealtime();
    return () => stopRealtime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const latest = useMemo(
    () => (submissions && submissions.length > 0 ? submissions[0] : null),
    [submissions]
  );

  const status = String(latest?.status || 'pending').toLowerCase();
  // Derive a simple timeline based on timestamps and status
  const timeline = useMemo(() => {
    const steps = [];
    if (latest?.created_at) {
      steps.push({
        key: 'created',
        label: 'Submitted',
        at: latest.created_at,
        done: true,
      });
    }
    steps.push({
      key: 'review',
      label: 'Under Review',
      at: latest?.updated_at || latest?.created_at || null,
      done: status !== 'pending', // if moved off pending, review is considered completed
      active: status === 'pending',
    });
    if (status === 'approved' || status === 'rejected') {
      steps.push({
        key: status,
        label: status === 'approved' ? 'Approved' : 'Rejected',
        at: latest?.updated_at || null,
        done: true,
      });
    }
    return steps;
  }, [latest, status]);

  return (
    <div className="container">
      <RetroCard title="KYC Status" subtitle="Track your verification progress in real time">
        {error && (
          <div style={{ color: 'var(--retro-danger)', marginBottom: 10 }}>
            {error.message}
          </div>
        )}
        {loading && <div style={{ color: 'var(--retro-text-dim)' }}>Loading...</div>}

        {!loading && !latest && (
          <div style={{ color: 'var(--retro-warning)' }}>
            No submission found. Please complete the KYC Form to get started.
          </div>
        )}

        {!loading && latest && (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--retro-border)',
                background: 'var(--retro-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--retro-text)' }}>
                  Submission #{latest.id?.slice(0, 8)} — {latest.document_type}
                </strong>
                <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                  {latest.first_name} {latest.last_name} • {latest.document_number}
                </span>
              </div>
              <StatusBadge status={status} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>Timeline</h3>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {timeline.map((t, idx) => (
                  <li
                    key={`${t.key}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: idx < timeline.length - 1 ? '1px solid var(--retro-border)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px solid var(--retro-border)',
                        background:
                          t.done ? 'var(--retro-success)' : t.active ? 'var(--retro-accent-2)' : 'var(--retro-surface-2)',
                        display: 'inline-block',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--retro-text)' }}>{t.label}</span>
                      <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                        {t.at ? new Date(t.at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {Array.isArray(latest.documents) && (
              <div>
                <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>
                  Uploaded Documents
                </h3>
                {latest.documents.length === 0 && (
                  <div style={{ color: 'var(--retro-text-dim)' }}>No documents uploaded yet.</div>
                )}
                {latest.documents.map((d, idx) => (
                  <div
                    key={`${d.path}-${idx}`}
                    style={{
                      padding: 10,
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
                      <strong style={{ color: 'var(--retro-text)' }}>{d.doc_type || 'document'}</strong>
                      <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                        {d.original_name} • {d.content_type} • {(Number(d.size || 0) / 1024).toFixed(1)} KB
                      </span>
                      <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                        {d.path}
                      </span>
                    </div>
                    <StatusBadge status="private" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </RetroCard>
    </div>
  );
}
