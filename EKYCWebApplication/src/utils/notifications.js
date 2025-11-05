//
// PUBLIC_INTERFACE
// notifications.js
// Lightweight notification bus for showing retro-styled toasts across the app.
//
import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import '../styles/retro.css';

const NotificationContext = createContext(null);

let idSeq = 0;

// PUBLIC_INTERFACE
export function useNotifications() {
  /**
   * Access notifications context to trigger toasts:
   * - notify.success(message, options?)
   * - notify.error(message, options?)
   * - notify.info(message, options?)
   * - notify.warn(message, options?)
   * - notify.custom({ title, message, type, duration })
   */
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

/**
 * Internal Toast component.
 */
function Toast({ toast, onClose }) {
  const { id, type, message, title } = toast;
  const color =
    type === 'success'
      ? 'var(--retro-success)'
      : type === 'error'
      ? 'var(--retro-danger)'
      : type === 'warn'
      ? 'var(--retro-warning)'
      : 'var(--retro-accent)';

  return (
    <div
      role="status"
      aria-live="polite"
      className="retro-toast"
      style={{
        border: '1px solid var(--retro-border)',
        borderLeft: `4px solid ${color}`,
        background:
          'linear-gradient(180deg, var(--retro-surface) 0%, var(--retro-surface-2) 100%)',
        color: 'var(--retro-text)',
        padding: '10px 12px',
        borderRadius: 10,
        boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
        minWidth: 260,
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ color }}>{title || type.toUpperCase()}</strong>
        <button
          type="button"
          aria-label="Close"
          onClick={() => onClose(id)}
          className="nav-link"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--retro-text-dim)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>
      {message && <div style={{ color: 'var(--retro-text)' }}>{message}</div>}
    </div>
  );
}

// PUBLIC_INTERFACE
export function NotificationProvider({ children }) {
  /**
   * Provides a global toast stack with helper methods.
   * Place near app root.
   */
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ type = 'info', title, message, duration = 3500 }) => {
      const id = ++idSeq;
      const toast = { id, type, title, message, createdAt: Date.now() };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        const tm = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, tm);
      }
      return id;
    },
    [remove]
  );

  const notify = useMemo(() => {
    return {
      success: (message, options = {}) =>
        push({ type: 'success', title: options.title || 'Success', message, duration: options.duration ?? 3000 }),
      error: (message, options = {}) =>
        push({ type: 'error', title: options.title || 'Error', message, duration: options.duration ?? 5000 }),
      info: (message, options = {}) =>
        push({ type: 'info', title: options.title || 'Info', message, duration: options.duration ?? 3500 }),
      warn: (message, options = {}) =>
        push({ type: 'warn', title: options.title || 'Warning', message, duration: options.duration ?? 4000 }),
      custom: (opts = {}) => push(opts),
      remove,
      clearAll: () => {
        timersRef.current.forEach((tm) => clearTimeout(tm));
        timersRef.current.clear();
        setToasts([]);
      },
    };
  }, [push, remove]);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16 + 56, // above footer
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 2000,
          maxWidth: '90vw',
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
