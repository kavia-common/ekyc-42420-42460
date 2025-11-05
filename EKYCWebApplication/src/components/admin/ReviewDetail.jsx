import React, { useEffect, useState } from 'react';
import '../../styles/retro.css';
import RetroCard from '../common/RetroCard';
import StatusBadge from '../common/StatusBadge';
import { useParams, useNavigate } from 'react-router-dom';
import useAdmin from '../../hooks/useAdmin';

/**
 * PUBLIC_INTERFACE
 * ReviewDetail
 * Admin detailed review page for a single submission.
 * Shows submission details, uploaded document metadata, and action controls.
 */
export default function ReviewDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const {
    fetchSubmissionById,
    approveSubmission,
    rejectSubmission,
    requestMoreInfo,
  } = useAdmin();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await fetchSubmissionById(submissionId);
      if (!mounted) return;
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to load submission' });
      } else {
        setSubmission(data);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [submissionId, fetchSubmissionById]);

  async function handleApprove() {
    setMessage(null);
    const { error } = await approveSubmission(submissionId, notes);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve' });
    } else {
      setMessage({ type: 'success', text: 'Submission approved' });
      setSubmission((s) => (s ? { ...s, status: 'approved' } : s));
    }
  }

  async function handleReject() {
    if (!notes || notes.trim().length < 3) {
      setMessage({ type: 'error', text: 'Please provide rejection reason in notes (min 3 chars).' });
      return;
    }
    setMessage(null);
    const { error } = await rejectSubmission(submissionId, notes);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to reject' });
    } else {
      setMessage({ type: 'success', text: 'Submission rejected' });
      setSubmission((s) => (s ? { ...s, status: 'rejected' } : s));
    }
  }

  async function handleRequestInfo() {
    if (!notes || notes.trim().length < 3) {
      setMessage({ type: 'error', text: 'Please describe what information is required (min 3 chars).' });
      return;
    }
    setMessage(null);
    const { error } = await requestMoreInfo(submissionId, notes);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to request info' });
    } else {
      setMessage({ type: 'success', text: 'Requested more information from user' });
      setSubmission((s) => (s ? { ...s, status: 'pending' } : s));
    }
  }

  return (
    <div className="container">
      <RetroCard title={`Review: ${submissionId?.slice(0, 8)}`} subtitle="Assess details and take action">
        <button className="nav-link" type="button" onClick={() => navigate('/admin')} style={{ marginBottom: 8 }}>
          ← Back to Admin
        </button>

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

        {loading && <div style={{ color: 'var(--retro-text-dim)' }}>Loading...</div>}

        {!loading && submission && (
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
                  {submission.first_name} {submission.last_name} — {submission.document_type}
                </strong>
                <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                  #{submission.id?.slice(0, 8)} • {submission.document_number}
                </span>
                <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                  Submitted: {submission.created_at ? new Date(submission.created_at).toLocaleString() : '—'}
                </span>
              </div>
              <StatusBadge status={submission.status} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>User Information</h3>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--retro-border)',
                  background: 'var(--retro-surface)',
                }}
              >
                <div style={{ color: 'var(--retro-text)' }}>
                  <div><strong>Name:</strong> {submission.first_name} {submission.last_name}</div>
                  <div><strong>DOB:</strong> {submission.dob || '—'}</div>
                  <div><strong>Address:</strong> {submission.address || '—'}</div>
                </div>
              </div>
            </div>

            {Array.isArray(submission.documents) && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>Documents</h3>
                {submission.documents.length === 0 && (
                  <div style={{ color: 'var(--retro-text-dim)' }}>No documents uploaded by user.</div>
                )}
                {submission.documents.map((d, idx) => (
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
                        Path: {d.path}
                      </span>
                      {d.preview_url && (
                        <a
                          href={d.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="nav-link"
                          style={{ width: 'fit-content', marginTop: 6 }}
                        >
                          Preview
                        </a>
                      )}
                    </div>
                    <StatusBadge status="private" />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>Decision</h3>
              <textarea
                placeholder="Notes (required for reject/request-more-info)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="retro-textarea"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--retro-border)',
                  background: 'var(--retro-surface)',
                  color: 'var(--retro-text)',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="nav-link" onClick={handleApprove} style={{ cursor: 'pointer' }}>
                  Approve
                </button>
                <button type="button" className="nav-link" onClick={handleReject} style={{ cursor: 'pointer' }}>
                  Reject
                </button>
                <button type="button" className="nav-link" onClick={handleRequestInfo} style={{ cursor: 'pointer' }}>
                  Request More Info
                </button>
              </div>
            </div>
          </>
        )}
      </RetroCard>
    </div>
  );
}
