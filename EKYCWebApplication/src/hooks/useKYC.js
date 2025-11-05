import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * - startRealtime(): subscribe to realtime changes for current user's submissions
 * - stopRealtime(): unsubscribe from realtime changes
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

  // Keep channel ref so we can unsubscribe reliably
  const channelRef = useRef(null);

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
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at, documents')
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
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at, documents')
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
      if (typeof updates.status !== 'undefined') {
        payload.status = String(updates.status || '').trim().toLowerCase();
      }
      if (typeof updates.documents !== 'undefined') {
        payload.documents = updates.documents; // assume proper JSON array provided by caller
      }

      const { data, error: upErr } = await supabase
        .from('kyc_submissions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at, documents')
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

  // PUBLIC_INTERFACE
  const startRealtime = useCallback(async () => {
    /** Subscribes to insert/update/delete events on kyc_submissions for current user and keeps local cache in sync. */
    if (!user) return;
    // Avoid duplicate channels
    if (channelRef.current) return;

    const channel = supabase
      .channel(`kyc_submissions_user_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_submissions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setSubmissions((prev) => {
            if (eventType === 'INSERT') {
              // Prepend new submission if not present
              const exists = prev.some((s) => s.id === newRow.id);
              const updated = exists ? prev.map((s) => (s.id === newRow.id ? newRow : s)) : [newRow, ...prev];
              // Keep order by created_at desc
              return [...updated].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            if (eventType === 'UPDATE') {
              return prev.map((s) => (s.id === newRow.id ? { ...s, ...newRow } : s));
            }
            if (eventType === 'DELETE') {
              return prev.filter((s) => s.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV !== 'production') console.log('Realtime status channel:', status);
      });

    channelRef.current = channel;
  }, [supabase, user]);

  // PUBLIC_INTERFACE
  const stopRealtime = useCallback(() => {
    /** Unsubscribes from realtime channel if present. */
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [supabase]);

  // Auto manage realtime subscription lifecycle
  useEffect(() => {
    // When user changes, reset local cache and subscription
    setSubmissions([]);
    stopRealtime();
    if (user?.id) {
      // Initial fetch and start realtime
      fetchMySubmissions();
      startRealtime();
    }
    return () => {
      stopRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return useMemo(
    () => ({
      submissions,
      loading,
      error,
      fetchMySubmissions,
      createSubmission,
      updateSubmission,
      deleteSubmission,
      startRealtime,
      stopRealtime,
    }),
    [submissions, loading, error, fetchMySubmissions, createSubmission, updateSubmission, deleteSubmission, startRealtime, stopRealtime]
  );
}
