import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', color: 'var(--maroon)' }}>Something went wrong</h2>
        <p style={{ color: '#6b6260', marginBottom: 24, maxWidth: 400 }}>
          An unexpected error occurred. Please reload the page. If the problem persists, contact your system administrator.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
        {import.meta.env.DEV && (
          <pre style={{
            marginTop: 24, padding: 16, background: 'var(--border)',
            borderRadius: 8, fontSize: 12, textAlign: 'left',
            maxWidth: 600, overflowX: 'auto', color: 'var(--maroon)',
          }}>
            {this.state.error?.toString()}
          </pre>
        )}
      </div>
    )
  }
}
