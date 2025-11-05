import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/retro.css';
import RetroCard from '../common/RetroCard';
import { useAuth } from '../../hooks/useAuth';
import useKYC from '../../hooks/useKYC';
import { getSupabaseClient } from '../../supabase/client';
import StatusBadge from '../common/StatusBadge';

/**
 * PUBLIC_INTERFACE
 * DocumentUpload
 * Allows the user to upload KYC documents to a private Supabase Storage bucket with validations and progress.
 * Files are stored at: kyc-documents/<userId>/<submissionId>/<docType>/<filename>
 * After upload, it stores file metadata/paths associated with the current user's most recent kyc_submissions record.
 */
export default function DocumentUpload() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const { submissions, fetchMySubmissions, updateSubmission, loading: kycLoading, error: kycError } = useKYC();

  // Select which submission to attach uploads to — use most recent by created_at
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  // Form state
  const [docType, setDocType] = useState('passport');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Validation rules
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  useEffect(() => {
    // Ensure we have the latest submissions
    fetchMySubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Pick the latest submission (first in list due to sorting in useKYC)
  const latestSubmission = useMemo(() => (submissions && submissions.length > 0 ? submissions[0] : null), [submissions]);

  useEffect(() => {
    setCurrentSubmissionId(latestSubmission?.id || null);
  }, [latestSubmission?.id]);

  function validateSelectedFile(f) {
    if (!f) return 'Please select a file.';
    if (!ALLOWED_MIME.includes(f.type)) {
      return 'Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10 MB.';
    }
    return null;
  }

  async function onFileChange(e) {
    setMessage(null);
    const f = e.target.files?.[0] || null;
    const v = validateSelectedFile(f);
    if (v) {
      setFile(null);
      setMessage({ type: 'error', text: v });
      return;
    }
    setFile(f);
  }

  function buildPath(uId, sId, type, filename) {
    // Sanitize doc type and filename a bit
    const safeType = String(type || 'unknown').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50);
    const safeName = String(filename || 'file').replace(/[^a-zA-Z0-9_.\-]/g, '_').slice(0, 200);
    return `${uId}/${sId}/${safeType}/${Date.now()}_${safeName}`;
  }

  async function persistFileMetadata({ submissionId, path, bucket, contentType, size, originalName, docTypeValue }) {
    // Store metadata inside the submission row. We keep an array JSON column 'documents' if present,
    // else we add a new 'document_paths' JSON array. This depends on DB schema flexibility.
    // Since we don't know schema beyond kyc_submissions base fields, we will attempt to update a 'documents' JSON array.
    // If your schema uses a different name, update here accordingly.
    const newDoc = {
      path,
      bucket,
      content_type: contentType,
      size,
      original_name: originalName,
      doc_type: docTypeValue,
      uploaded_at: new Date().toISOString(),
      visibility: 'private',
    };

    // Fetch current submission to merge
    const { data: current, error: fetchErr } = await supabase
      .from('kyc_submissions')
      .select('id, documents')
      .eq('id', submissionId)
      .single();

    if (fetchErr && String(fetchErr.message || '').toLowerCase().includes('row not found')) {
      return { error: new Error('Submission not found to attach document.') };
    }
    if (fetchErr && !current) {
      return { error: fetchErr };
    }

    const docs = Array.isArray(current?.documents) ? current.documents : [];
    const updatedDocs = [...docs, newDoc];

    // We reuse updateSubmission from useKYC to keep consistency
    const { error: upErr } = await updateSubmission(submissionId, { documents: updatedDocs });
    if (upErr) {
      return { error: upErr };
    }
    return { error: null };
  }

  async function onUpload(e) {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'You must be signed in to upload documents.' });
      return;
    }
    if (!currentSubmissionId) {
      setMessage({ type: 'error', text: 'No submission found. Please create a KYC submission first.' });
      return;
    }
    const v = validateSelectedFile(file);
    if (v) {
      setMessage({ type: 'error', text: v });
      return;
    }

    const bucket = 'kyc-documents'; // Must exist and be private in Supabase
    const storage = supabase.storage.from(bucket);
    const storagePath = buildPath(user.id, currentSubmissionId, docType, file.name);

    try {
      setUploading(true);
      setProgress(0);

      // Supabase JS v2 upload doesn't expose native progress; we simulate by slicing upload
      // For simplicity and to avoid memory overhead, we will just perform a single upload and set progress to 100 when done.
      const { error: uploadErr } = await storage.upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadErr) {
        setMessage({ type: 'error', text: uploadErr.message || 'Upload failed.' });
        return;
      }

      setProgress(100);

      // Persist file metadata to the submission
      const metaRes = await persistFileMetadata({
        submissionId: currentSubmissionId,
        path: storagePath,
        bucket,
        contentType: file.type,
        size: file.size,
        originalName: file.name,
        docTypeValue: docType,
      });

      if (metaRes.error) {
        setMessage({ type: 'error', text: metaRes.error.message || 'Failed to save file metadata.' });
        return;
      }

      setMessage({ type: 'success', text: 'File uploaded and linked to your submission.' });
      setFile(null);
      setProgress(0);
      // Refresh list to reflect updated documents/status if any
      await fetchMySubmissions();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container">
      <RetroCard
        title="Document Upload"
        subtitle="Upload your KYC documents securely. Only supported file types are allowed."
      >
        {/* Current submission status summary */}
        <div style={{ marginBottom: 16 }}>
          {kycError && <div style={{ color: 'var(--retro-danger)', marginBottom: 8 }}>{kycError.message}</div>}
          {kycLoading && <div style={{ color: 'var(--retro-text-dim)' }}>Loading submissions...</div>}
          {!kycLoading && latestSubmission && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--retro-border)',
                background: 'var(--retro-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--retro-text)' }}>
                  Submission #{latestSubmission.id?.slice(0, 8)} — {latestSubmission.document_type}
                </strong>
                <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                  {latestSubmission.first_name} {latestSubmission.last_name} • {latestSubmission.document_number}
                </span>
              </div>
              <StatusBadge status={latestSubmission.status || 'pending'} />
            </div>
          )}
          {!kycLoading && !latestSubmission && (
            <div style={{ color: 'var(--retro-warning)' }}>
              You do not have any submissions yet. Please complete the KYC Form first.
            </div>
          )}
        </div>

        <form onSubmit={onUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>Document Type</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="retro-input"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--retro-border)',
                  background: 'var(--retro-surface)',
                  color: 'var(--retro-text)',
                }}
                disabled={uploading}
                required
              >
                <option value="passport">Passport</option>
                <option value="driver_license">Driver License</option>
                <option value="national_id">National ID</option>
                <option value="proof_of_address">Proof of Address</option>
                <option value="selfie">Selfie</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>File</span>
              <input
                type="file"
                onChange={onFileChange}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid var(--retro-border)',
                  background: 'var(--retro-surface)',
                  color: 'var(--retro-text)',
                }}
                disabled={uploading}
              />
              <span style={{ color: 'var(--retro-text-dim)', fontSize: 12 }}>
                Allowed types: JPG, PNG, WEBP, PDF. Max size {Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB.
              </span>
            </label>
          </div>

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  width: '100%',
                  background: 'var(--retro-surface)',
                  border: '1px solid var(--retro-border)',
                  height: 12,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--retro-accent)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ color: 'var(--retro-text-dim)', marginTop: 6, fontSize: 12 }}>Uploading...</div>
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: 12,
                color: message.type === 'error' ? 'var(--retro-danger)' : 'var(--retro-success)',
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={uploading || !file || !currentSubmissionId}
              className="nav-link"
              style={{ cursor: uploading || !file || !currentSubmissionId ? 'not-allowed' : 'pointer' }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>

        {/* Existing uploaded docs list (if documents JSON is present) */}
        {!kycLoading && latestSubmission?.documents && Array.isArray(latestSubmission.documents) && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: 'var(--retro-text)' }}>Uploaded Documents</h3>
            {latestSubmission.documents.length === 0 && (
              <div style={{ color: 'var(--retro-text-dim)' }}>No documents uploaded yet.</div>
            )}
            {latestSubmission.documents.map((d, idx) => (
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
      </RetroCard>
    </div>
  );
}
