/**
 * PUBLIC_INTERFACE
 * ErrorBoundary
 * Catches render-time errors and shows a retro-styled fallback with reset option.
 */
import React from 'react';
import '../../styles/retro.css';
import RetroCard from './RetroCard';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(error) {
    return { err: error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  handleReset = () => {
    this.setState({ err: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.err) {
      return (
        <div className="container">
          <RetroCard title="Something went wrong" subtitle="A retro gremlin intercepted your request">
            <div style={{ color: 'var(--retro-danger)', marginBottom: 10, wordBreak: 'break-word' }}>
              {this.state.err?.message || String(this.state.err)}
            </div>
            <button className="nav-link" type="button" onClick={this.handleReset} style={{ cursor: 'pointer' }}>
              Try Again
            </button>
          </RetroCard>
        </div>
      );
    }
    return this.props.children;
  }
}
