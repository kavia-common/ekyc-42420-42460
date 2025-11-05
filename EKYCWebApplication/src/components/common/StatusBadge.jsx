import React from 'react';
import '../../styles/retro.css';

/**
 * PUBLIC_INTERFACE
 * StatusBadge
 * Shows a colored badge for KYC statuses.
 */
export default function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  return (
    <span className={`status-badge status-${normalized}`}>
      {normalized ? normalized.toUpperCase() : 'UNKNOWN'}
    </span>
  );
}
