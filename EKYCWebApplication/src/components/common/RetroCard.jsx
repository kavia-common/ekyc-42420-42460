import React from 'react';
import '../../styles/retro.css';

/**
 * PUBLIC_INTERFACE
 * RetroCard
 * A simple retro-styled card for grouping content.
 */
export default function RetroCard({ title, subtitle, children }) {
  return (
    <section className="retro-card">
      {(title || subtitle) && (
        <header className="retro-card-header">
          {title && <h2 className="retro-card-title">{title}</h2>}
          {subtitle && <p className="retro-card-subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="retro-card-body">{children}</div>
    </section>
  );
}
