import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import '../../styles/retro.css';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../utils/notifications';

/**
 * PUBLIC_INTERFACE
 * Navbar
 * Top navigation bar with Retro styling and conditional links from auth state.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const notify = useNotifications();

  async function onLogout() {
    const { error } = await signOut();
    if (error) {
      notify.error(error.message || 'Logout failed');
    } else {
      notify.info('Signed out');
      navigate('/', { replace: true });
    }
  }

  return (
    <header className="retro-nav">
      <div className="retro-container">
        <Link to="/" className="brand">
          <span className="brand-logo">⌁</span>
          <span className="brand-text">EKYC</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className="nav-link">Home</NavLink>
          {!isAuthenticated && (
            <>
              <NavLink to="/login" className="nav-link">Login</NavLink>
              <NavLink to="/register" className="nav-link">Register</NavLink>
            </>
          )}
          {isAuthenticated && (
            <>
              <NavLink to="/profile" className="nav-link">Profile</NavLink>
              <NavLink to="/kyc/form" className="nav-link">KYC Form</NavLink>
              <NavLink to="/kyc/upload" className="nav-link">Upload</NavLink>
              <NavLink to="/kyc/status" className="nav-link">Status</NavLink>
              <button onClick={onLogout} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                Logout
              </button>
            </>
          )}
          {isAdmin && <NavLink to="/admin" className="nav-link">Admin</NavLink>}
        </nav>
      </div>
    </header>
  );
}
