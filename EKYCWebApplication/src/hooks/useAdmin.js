import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '../supabase/client';
import { useAuth } from './useAuth';

/**
 * PUBLIC_INTERFACE
 * useAdmin
 * Admin-focused hook for:
 * - listing kyc_submissions with filters and pagination
 * - retrieving a single submission with related details
 * - approving, rejecting, requesting more info
 * - writing audit logs to kyc_audit_logs
 *
 * RBAC: relies on RLS policies (backend) to restrict operations to admin role.
 * This hook checks useAuth().isAdmin for client-side gating as well.
 */
export default function useAdmin() {
  const supabase = getSupabaseClient();
  const { user, isAdmin } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    status: 'all', // all | pending | approved | rejected
    search: '', // by name or document number
    docType: 'all', // all | passport | driver_license | national_id | ...
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Internal: builds filter query for Supabase
  function _applyFilters(query) {
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.docType && filters.docType !== 'all') {
      query = query.eq('document_type', filters.docType);
    }
    if (filters.search && filters.search.trim().length > 0) {
      const s = filters.search.trim();
      // OR filter: first_name/last_name/document_number ilike
      query = query.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,document_number.ilike.%${s}%`
      );
    }
    return query;
  }

  // PUBLIC_INTERFACE
  const fetchSubmissions = useCallback(
    async (opts) => {
      /**
       * Fetch submissions for admin with filters and pagination.
       * Returns { data, error, total }.
       */
      if (!user || !isAdmin) {
        const err = new Error('Admin access required');
        setError(err);
        setSubmissions([]);
        return { data: null, error: err, total: 0 };
      }
      const nextFilters = opts?.filters || filters;
      const nextPage = opts?.page || page;
      const nextPageSize = opts?.pageSize || pageSize;

      setLoading(true);
      setError(null);
      try {
        // Count total using a separate head query
        let countQuery = supabase
          .from('kyc_submissions')
          .select('id', { count: 'exact', head: true });

        countQuery = _applyFilters(countQuery);
        const { count, error: countErr } = await countQuery;
        if (countErr) {
          setError(countErr);
          return { data: null, error: countErr, total: 0 };
        }
        setTotal(count || 0);

        const from = (nextPage - 1) * nextPageSize;
        const to = from + nextPageSize - 1;

        let listQuery = supabase
          .from('kyc_submissions')
          .select(
            'id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at, documents'
          )
          .order('created_at', { ascending: false })
          .range(from, to);

        listQuery = _applyFilters(listQuery);
        const { data, error: fetchErr } = await listQuery;

        if (fetchErr) {
          setError(fetchErr);
          setSubmissions([]);
          return { data: null, error: fetchErr, total: 0 };
        }
        setSubmissions(data || []);
        return { data, error: null, total: count || 0 };
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, isAdmin, filters, page, pageSize]
  );

  // PUBLIC_INTERFACE
  const fetchSubmissionById = useCallback(
    async (id) => {
      /** Fetch a single submission row by id for review purposes. */
      if (!user || !isAdmin) {
        const err = new Error('Admin access required');
        setError(err);
        return { data: null, error: err };
      }
      if (!id) {
        const err = new Error('submissionId is required');
        setError(err);
        return { data: null, error: err };
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('kyc_submissions')
          .select(
            'id, user_id, first_name, last_name, dob, address, document_type, document_number, status, created_at, updated_at, documents'
          )
          .eq('id', id)
          .single();
        if (fetchErr) {
          setError(fetchErr);
          return { data: null, error: fetchErr };
        }
        return { data, error: null };
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, isAdmin]
  );

  async function writeAuditLog(submissionId, action, notes) {
    // Writes an audit entry to kyc_audit_logs
    const payload = {
      submission_id: submissionId,
      action, // 'approved' | 'rejected' | 'request_info'
      notes: notes || '',
      actor_user_id: user?.id || null,
      created_at: new Date().toISOString(),
    };
    const { error: logErr } = await supabase.from('kyc_audit_logs').insert(payload);
    return { error: logErr || null };
  }

  // PUBLIC_INTERFACE
  const approveSubmission = useCallback(
    async (submissionId, notes) => {
      /**
       * Sets status=approved and writes an audit log.
       */
      if (!user || !isAdmin) return { error: new Error('Admin access required') };
      if (!submissionId) return { error: new Error('submissionId is required') };

      setLoading(true);
      setError(null);
      try {
        const { data, error: upErr } = await supabase
          .from('kyc_submissions')
          .update({ status: 'approved' })
          .eq('id', submissionId)
          .select('id, status, updated_at')
          .single();
        if (upErr) {
          setError(upErr);
          return { error: upErr };
        }
        const { error: logErr } = await writeAuditLog(submissionId, 'approved', notes);
        if (logErr) {
          // log error but do not fail the status update
          // eslint-disable-next-line no-console
          console.warn('Audit log write failed:', logErr.message || logErr);
        }
        // update local cache if present
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status: 'approved' } : s)));
        return { error: null, data };
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, isAdmin]
  );

  // PUBLIC_INTERFACE
  const rejectSubmission = useCallback(
    async (submissionId, notes) => {
      /**
       * Sets status=rejected and writes an audit log.
       */
      if (!user || !isAdmin) return { error: new Error('Admin access required') };
      if (!submissionId) return { error: new Error('submissionId is required') };

      setLoading(true);
      setError(null);
      try {
        const { data, error: upErr } = await supabase
          .from('kyc_submissions')
          .update({ status: 'rejected' })
          .eq('id', submissionId)
          .select('id, status, updated_at')
          .single();
        if (upErr) {
          setError(upErr);
          return { error: upErr };
        }
        const { error: logErr } = await writeAuditLog(submissionId, 'rejected', notes);
        if (logErr) {
          // eslint-disable-next-line no-console
          console.warn('Audit log write failed:', logErr.message || logErr);
        }
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status: 'rejected' } : s)));
        return { error: null, data };
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, isAdmin]
  );

  // PUBLIC_INTERFACE
  const requestMoreInfo = useCallback(
    async (submissionId, notes) => {
      /**
       * Keeps status=pending (or sets to pending) and writes an audit log with request-more-info action.
       * The notes should describe what to provide.
       */
      if (!user || !isAdmin) return { error: new Error('Admin access required') };
      if (!submissionId) return { error: new Error('submissionId is required') };

      setLoading(true);
      setError(null);
      try {
        const { data, error: upErr } = await supabase
          .from('kyc_submissions')
          .update({ status: 'pending' })
          .eq('id', submissionId)
          .select('id, status, updated_at')
          .single();
        if (upErr) {
          setError(upErr);
          return { error: upErr };
        }
        const { error: logErr } = await writeAuditLog(submissionId, 'request_info', notes);
        if (logErr) {
          // eslint-disable-next-line no-console
          console.warn('Audit log write failed:', logErr.message || logErr);
        }
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status: 'pending' } : s)));
        return { error: null, data };
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, isAdmin]
  );

  // Helpers for paging/filters
  const setStatusFilter = useCallback((status) => {
    setFilters((f) => ({ ...f, status }));
    setPage(1);
  }, []);
  const setDocTypeFilter = useCallback((docType) => {
    setFilters((f) => ({ ...f, docType }));
    setPage(1);
  }, []);
  const setSearchFilter = useCallback((text) => {
    setFilters((f) => ({ ...f, search: text }));
    setPage(1);
  }, []);

  useEffect(() => {
    // auto fetch when filters/page change and admin signed in
    if (isAdmin) {
      fetchSubmissions();
    } else {
      setSubmissions([]);
      setTotal(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status, filters.docType, filters.search]);

  return useMemo(
    () => ({
      // state
      submissions,
      loading,
      error,
      page,
      pageSize,
      total,
      filters,
      // pagination/filter controls
      setPage,
      setStatusFilter,
      setDocTypeFilter,
      setSearchFilter,
      // data ops
      fetchSubmissions,
      fetchSubmissionById,
      approveSubmission,
      rejectSubmission,
      requestMoreInfo,
    }),
    [
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
      fetchSubmissions,
      fetchSubmissionById,
      approveSubmission,
      rejectSubmission,
      requestMoreInfo,
    ]
  );
}
