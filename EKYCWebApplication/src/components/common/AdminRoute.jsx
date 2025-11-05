import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * AdminRoute
 * Restricts access to admin users. Replace placeholder role check with real RBAC.
 */
export default function AdminRoute() {
  // TODO: implement role-based access check from user profile/claims
  const isAuthenticated = false; // placeholder
  const isAdmin = false; // placeholder
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
