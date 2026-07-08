import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--maroon)', lineHeight: 1 }}>404</div>
      <h2 style={{ margin: '12px 0 8px', color: 'var(--text)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28, maxWidth: 360 }}>
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
        <Link to="/" className="btn btn-primary">Go to Home</Link>
      </div>
    </div>
  )
}
