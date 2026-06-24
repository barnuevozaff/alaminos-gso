import { Link } from 'react-router-dom'

const LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Ph_seal_alaminos_laguna.png/120px-Ph_seal_alaminos_laguna.png'

export default function PublicHome() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="topbar" style={{ justifyContent: 'flex-start' }}>
        <img src={LOGO} alt="" style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 12 }}
          onError={(e) => { e.target.style.visibility = 'hidden' }} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Municipality of Alaminos</div>
          <div style={{ fontWeight: 700 }}>General Services Office (GSO)</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Purchase Request &amp; Inventory Management System</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 720, width: '100%' }}>
          <Link to="/submit" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
            <h3 style={{ margin: '0 0 6px' }}>Submit a Purchase Request</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>Fill out a request for items needed by your department.</p>
          </Link>

          <Link to="/track" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <h3 style={{ margin: '0 0 6px' }}>Track a Purchase Request</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>Check the status of a request using its PR number.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
