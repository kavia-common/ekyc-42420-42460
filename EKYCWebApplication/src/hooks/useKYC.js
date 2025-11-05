import { useCallback, useMemo, useState } from 'react';
import { getSupabaseClient } from '../supabase/client';
import { useAuth } from './useAuth';

/**
 * PUBLIC_INTERFACE
 * useKYC
 * Hook to perform CRUD operations for the 'kyc_submissions' table in Supabase.
 * It exposes:
 * - submissions: list of current user's submissions
 * - loading, error
 * - fetchMySubmissions(): fetch all submissions for the current user
 * - createSubmission(payload): create a new submission with status 'pending'
 * - updateSubmission(id, updates): update allowed fields of a submission owned by the user
 * - deleteSubmission(id): delete a submission owned by the user
 * 
 * Table expected schema (at minimum):
 * - id (uuid, pk)
 * - user_id (uuid, references auth.users.id)
 * - first_name (text)
 * - last_name (text)
 * - dob (date)
 * - address (text)
 * - document_type (text)
 * - document_number (text)
 * - status (text: 'pending' | 'approved' | 'rejected')
 * - created_at (timestamp)
 * - updated_at (timestamp)
 */
export default function useKYC() {
  const supabase = getSupabaseClient();
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PUBLIC_INTERFACE
  const fetchMySubmissions = useCallback(async () => {
    /** Fetches all KYC submissions for the current authenticated user sorted by created_at desc. */
    if (!user) {
      const err = new Error('Not authenticated');
      setError(err);
      setSubmissions([]);
      return { data: null, error: err };
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('kyc_submissions')
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (fetchErr) {
        setError(fetchErr);
        setSubmissions([]);
        return { data: null, error: fetchErr };
      }
      setSubmissions(data || []);
      return { data, error: null };
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  // PUBLIC_INTERFACE
  const createSubmission = useCallback(async (payload) => {
    /**
     * Creates a new submission for the current user with status 'pending'.
     * Validates and sanitizes basic fields client-side.
     */
    if (!user) {
      const err = new Error('Not authenticated');
      setError(err);
      return { data: null, error: err };
    }
    setLoading(true);
    setError(null);
    try {
      const clean = {};
      clean.first_name = String(payload.first_name || '').trim().slice(0, 100);
      clean.last_name = String(payload.last_name || '').trim().slice(0, 100);
      clean.address = String(payload.address || '').trim().slice(0, 500);
      clean.document_type = String(payload.document_type || '').trim().slice(0, 50);
      clean.document_number = String(payload.document_number || '').trim().slice(0, 100);

      // Accept YYYY-MM-DD or blank
      if (payload.dob) {
        const dobStr = String(payload.dob);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
          const err = new Error('DOB must be in YYYY-MM-DD format');
          setError(err);
          return { data: null, error: err };
        }
        clean.dob = dobStr;
      } else {
        clean.dob = null;
      }

      const insertPayload = {
        ...clean,
        user_id: user.id,
        status: 'pending',
      };

      const { data, error: insErr } = await supabase
        .from('kyc_submissions')
        .insert(insertPayload)
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at')
        .single();

      if (insErr) {
        setError(insErr);
        return { data: null, error: insErr };
      }

      // Update local cache optimistic
      setSubmissions((prev) => [data, ...prev]);
      return { data, error: null };
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  // PUBLIC_INTERFACE
  const updateSubmission = useCallback(async (id, updates) => {
    /** Updates a submission that belongs to the current user. */
    if (!user) {
      const err = new Error('Not authenticated');
      setError(err);
      return { data: null, error: err };
    }
    if (!id) {
      const err = new Error('Submission id is required');
      setError(err);
      return { data: null, error: err };
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {};
      if (typeof updates.first_name !== 'undefined') payload.first_name = String(updates.first_name || '').trim().slice(0, 100);
      if (typeof updates.last_name !== 'undefined') payload.last_name = String(updates.last_name || '').trim().slice(0, 100);
      if (typeof updates.address !== 'undefined') payload.address = String(updates.address || '').trim().slice(0, 500);
      if (typeof updates.document_type !== 'undefined') payload.document_type = String(updates.document_type || '').trim().slice(0, 50);
      if (typeof updates.document_number !== 'undefined') payload.document_number = String(updates.document_number || '').trim().slice(0, 100);
      if (typeof updates.dob !== 'undefined') {
        const dobStr = updates.dob ? String(updates.dob) : null;
        if (dobStr && !/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
          const err = new Error('DOB must be in YYYY-MM-DD format');
          setError(err);
          return { data: null, error: err };
        }
        payload.dob = dobStr;
      }
      // status changes should be admin-driven, do not update here unless provided intentionally for future
      if (typeof updates.status !== 'undefined') {
        payload.status = String(updates.status || '').trim().toLowerCase();
      }

      const { data, error: upErr } = await supabase
        .from('kyc_submissions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at')
        .single();

      if (upErr) {
        setError(upErr);
        return { data: null, error: upErr };
      }

      setSubmissions((prev) => prev.map((s) => (s.id === id ? data : s)));
      return { data, error: null };
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  // PUBLIC_INTERFACE
  const deleteSubmission = useCallback(async (id) => {
    /** Deletes a submission that belongs to the current user. */
    if (!user) {
      const err = new Error('Not authenticated');
      setError(err);
      return { error: err };
    }
    if (!id) {
      const err = new Error('Submission id is required');
      setError(err);
      return { error: err };
    }
    setLoading(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('kyc_submissions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (delErr) {
        setError(delErr);
        return { error: delErr };
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      return { error: null };
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  return useMemo(
    () => ({
      submissions,
      loading,
      error,
      fetchMySubmissions,
      createSubmission,
      updateSubmission,
      deleteSubmission,
    }),
    [submissions, loading, error, fetchMySubmissions, createSubmission, updateSubmission, deleteSubmission]
  );
}
