import React from 'react';
import '../../styles/retro.css';

/**
 * PUBLIC_INTERFACE
 * Footer
 * Simple sticky footer with Retro style.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="retro-footer">
      <div className="retro-container">
        <span>© {year} EKYC Retro</span>
        <nav className="footer-links">
          <a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">React</a>
        </nav>
      </div>
    </footer>
  );
}
