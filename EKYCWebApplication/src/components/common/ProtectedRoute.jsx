import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute
 * Gate for authenticated users. Replace placeholder auth check with real state.
 */
export default function ProtectedRoute() {
  // TODO: wire up real auth state via Supabase auth listener/context
  const isAuthenticated = false; // placeholder
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
