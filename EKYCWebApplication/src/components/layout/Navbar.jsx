import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../../styles/retro.css';

/**
 * PUBLIC_INTERFACE
 * Navbar
 * Top navigation bar with Retro styling and placeholder conditional links.
 */
export default function Navbar() {
  // TODO: read auth state from context/store
  const isAuthenticated = false; // placeholder
  const isAdmin = false; // placeholder

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
            </>
          )}
          {isAdmin && <NavLink to="/admin" className="nav-link">Admin</NavLink>}
        </nav>
      </div>
    </header>
  );
}
