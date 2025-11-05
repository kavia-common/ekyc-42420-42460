import { createClient } from '@supabase/supabase-js';

/**
 * PUBLIC_INTERFACE
 * getSupabaseClient
 * Returns a singleton Supabase client configured using environment variables.
 * Required ENV:
 * - REACT_APP_SUPABASE_URL
 * - REACT_APP_SUPABASE_ANON_KEY
 */
let supabaseInstance = null;

// PUBLIC_INTERFACE
export function getSupabaseClient() {
  /** Returns the initialized Supabase client or throws if env is missing. */
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Do not expose secrets; guide environment setup via error
    // This throws in development; in production ensure env is set.
    // eslint-disable-next-line no-console
    console.error('Supabase env vars missing. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
  }

  supabaseInstance = createClient(url || '', key || '');
  return supabaseInstance;
}

export default getSupabaseClient();
