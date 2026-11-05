import React from 'react';
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '32px',
            margin: '24px auto',
            maxWidth: '640px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <WarningCircle size={28} weight="fill" style={{ color: 'var(--danger)' }} aria-hidden="true" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              An unexpected error occurred in this view
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-muted)', lineHeight: '22px' }}>
            WhyLine caught an unhandled exception. Your local fences and state are preserved in the ledger.
          </p>
          {this.state.error?.message && (
            <pre
              style={{
                margin: 0,
                padding: '12px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--border)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                color: 'var(--danger)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowClockwise size={16} aria-hidden="true" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
