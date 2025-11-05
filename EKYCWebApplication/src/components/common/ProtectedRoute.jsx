import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute
 * Gate for authenticated users. Uses Supabase-backed auth state from useAuth.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Show nothing (or a loader) while initializing to prevent flicker/redirect loops
  if (initializing) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
