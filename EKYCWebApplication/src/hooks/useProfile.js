import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../supabase/client';
import { useAuth } from './useAuth';

/**
 * PUBLIC_INTERFACE
 * useProfile
 * Hook for reading and writing user profile data from the Supabase 'profiles' table.
 * Exposes profile, loading, error, save, refresh, and initialized state.
 */
export default function useProfile() {
  const supabase = getSupabaseClient();
  const { user, profile: authProfile, initializing: authInitializing } = useAuth();

  const [profile, setProfile] = useState(authProfile || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch profile for current user
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setInitialized(true);
      return { data: null, error: null };
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, avatar_url, dob, address, phone')
        .eq('id', user.id)
        .single();

      if (fetchErr) {
        // If profile not found, try to create a default one (safety; auth provider already tries)
        if (String(fetchErr.message || '').toLowerCase().includes('row not found') || fetchErr.code === 'PGRST116') {
          const insertPayload = {
            id: user.id,
            email: user.email,
            role: 'user',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            dob: null,
            address: '',
            phone: '',
          };
          const { data: created, error: insertErr } = await supabase
            .from('profiles')
            .insert(insertPayload)
            .select('id, email, role, full_name, avatar_url, dob, address, phone')
            .single();
          if (insertErr) {
            setError(insertErr);
            setProfile(null);
            setInitialized(true);
            return { data: null, error: insertErr };
          }
          setProfile(created);
          setInitialized(true);
          return { data: created, error: null };
        }
        setError(fetchErr);
        setProfile(null);
        setInitialized(true);
        return { data: null, error: fetchErr };
      }
      setProfile(data || null);
      setInitialized(true);
      return { data, error: null };
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    // When auth finishes initializing or user changes, try to sync
    if (!authInitializing) {
      if (authProfile) {
        // Prefer the latest from auth provider if available
        setProfile((prev) => prev || authProfile);
        setInitialized(true);
      } else {
        // No profile from context; fetch directly
        fetchProfile();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInitializing, user?.id]);

  // PUBLIC_INTERFACE
  const refresh = useCallback(async () => {
    /** Manually refreshes the profile from Supabase. */
    return fetchProfile();
  }, [fetchProfile]);

  // PUBLIC_INTERFACE
  const save = useCallback(
    async (updates) => {
      /**
       * Saves allowed fields into the profile row of the current user.
       * Allowed: full_name, dob, address, phone.
       */
      if (!user) {
        const err = new Error('Not authenticated');
        setError(err);
        return { data: null, error: err };
      }
      setSaving(true);
      setError(null);
      try {
        // Basic sanitization/validation can happen here
        const payload = {};
        if (typeof updates.full_name !== 'undefined') payload.full_name = String(updates.full_name || '').slice(0, 200);
        if (typeof updates.dob !== 'undefined') {
          // Accept empty or a valid YYYY-MM-DD
          const dobStr = updates.dob ? String(updates.dob) : null;
          if (dobStr && !/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
            const err = new Error('DOB must be in YYYY-MM-DD format');
            setError(err);
            return { data: null, error: err };
          }
          payload.dob = dobStr;
        }
        if (typeof updates.address !== 'undefined') payload.address = String(updates.address || '').slice(0, 500);
        if (typeof updates.phone !== 'undefined') {
          const phoneStr = String(updates.phone || '');
          if (phoneStr && !/^[\d+\-\s()]{6,20}$/.test(phoneStr)) {
            const err = new Error('Phone contains invalid characters');
            setError(err);
            return { data: null, error: err };
          }
          payload.phone = phoneStr.slice(0, 30);
        }

        const { data, error: upErr } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select('id, email, role, full_name, avatar_url, dob, address, phone')
          .single();

        if (upErr) {
          setError(upErr);
          return { data: null, error: upErr };
        }

        setProfile(data || null);
        return { data, error: null };
      } finally {
        setSaving(false);
      }
    },
    [supabase, user]
  );

  return useMemo(
    () => ({
      profile,
      loading,
      saving,
      error,
      initialized,
      refresh,
      save,
    }),
    [profile, loading, saving, error, initialized, refresh, save]
  );
}
