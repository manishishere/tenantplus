import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '400px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'var(--font-family, system-ui, sans-serif)',
          color: 'var(--text-main, #1e293b)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '550px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <AlertCircle size={44} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#ef4444' }}>
              Something went wrong loading this view
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', marginBottom: '1.25rem' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
                style={{
                  background: 'var(--primary-indigo, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--text-main, #1e293b)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Try Re-rendering
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#f87171', overflowX: 'auto' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error Stack Trace</summary>
                <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
