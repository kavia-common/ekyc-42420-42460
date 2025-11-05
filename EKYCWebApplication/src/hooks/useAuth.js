import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import supabaseClient, { getSupabaseClient } from '../supabase/client';

/**
 * PUBLIC_INTERFACE
 * AuthProvider
 * React context provider that exposes Supabase auth session, profile, and role-based utilities across the app.
 */
const AuthContext = createContext(null);

const PROFILE_TABLE = 'profiles'; // expected to exist in Supabase
const DEFAULT_ROLE = 'user';

/**
 * Fetches the profile row for the given user id and returns role and profile.
 */
async function fetchUserProfileRole(supabase, userId) {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id, email, role, full_name, avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('Profile fetch error (non-fatal):', error.message);
    return { profile: null, role: null };
  }

  return {
    profile: data || null,
    role: (data && data.role) ? String(data.role) : null,
  };
}

/**
 * Ensures a profile row exists for a given user; if not, it creates one with default role.
 */
async function ensureProfileExists(supabase, user) {
  if (!user) return { profile: null, role: null };

  const { profile, role } = await fetchUserProfileRole(supabase, user.id);
  if (profile) {
    return { profile, role: role || DEFAULT_ROLE };
  }

  // Insert a default profile
  const insertPayload = {
    id: user.id,
    email: user.email,
    role: DEFAULT_ROLE,
    full_name: user.user_metadata?.full_name || '',
    avatar_url: user.user_metadata?.avatar_url || '',
  };

  const { data, error } = await supabase.from(PROFILE_TABLE).insert(insertPayload).select('id, email, role, full_name, avatar_url').single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create profile row:', error.message);
    return { profile: null, role: null };
  }

  return { profile: data, role: data.role || DEFAULT_ROLE };
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider
 * Provides auth state, profile, role, and helper methods to children.
 */
export function AuthProvider({ children }) {
  const supabase = supabaseClient || getSupabaseClient();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  // Initialize session and profile
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!isMounted) return;

        setSession(currentSession || null);
        const currentUser = currentSession?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const ensured = await ensureProfileExists(supabase, currentUser);
          if (!isMounted) return;
          setProfile(ensured.profile);
          setRole(ensured.role || DEFAULT_ROLE);
        } else {
          setProfile(null);
          setRole(null);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth initialization error:', e);
        if (isMounted) setError(e);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    })();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession || null);
      const currentUser = newSession?.user || null;
      setUser(currentUser);
      setLoading(true);
      try {
        if (currentUser) {
          const { profile: prof, role: r } = await fetchUserProfileRole(supabase, currentUser.id);
          // If no profile yet after sign-in, ensure it exists
          let finalProfile = prof;
          let finalRole = r;
          if (!prof) {
            const ensured = await ensureProfileExists(supabase, currentUser);
            finalProfile = ensured.profile;
            finalRole = ensured.role;
          }
          setProfile(finalProfile);
          setRole(finalRole || DEFAULT_ROLE);
        } else {
          setProfile(null);
          setRole(null);
        }
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers
  const signInWithPassword = useCallback(async ({ email, password }) => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError);
      return { data: null, error: signInError };
    }
    return { data, error: null };
  }, [supabase]);

  // PUBLIC_INTERFACE
  const registerWithEmail = useCallback(async ({ email, password, full_name }) => {
    /**
     * Registers a new user using email/password and sets initial metadata.
     * Note: emailRedirectTo must be configured by env at deployment time.
     */
    setError(null);
    const siteUrl = process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_SITE_URL || window.location.origin;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: { full_name },
      },
    });
    if (signUpError) {
      setError(signUpError);
      return { data: null, error: signUpError };
    }
    return { data, error: null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError);
      return { error: signOutError };
    }
    return { error: null };
  }, [supabase]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    role: role || DEFAULT_ROLE,
    isAuthenticated: !!user,
    isAdmin: String(role || '').toLowerCase() === 'admin',
    loading,
    initializing,
    error,
    signInWithPassword,
    registerWithEmail,
    signOut,
  }), [session, user, profile, role, loading, initializing, error, signInWithPassword, registerWithEmail, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * PUBLIC_INTERFACE
 * useAuth
 * Accessor hook for the Auth context.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default useAuth;
