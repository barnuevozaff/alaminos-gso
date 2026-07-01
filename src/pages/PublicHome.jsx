import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import LOGO from '../assets/alaminos-seal.jpeg'

export default function PublicHome() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="topbar" style={{ justifyContent: 'flex-start', background: 'var(--maroon)', color: '#fff' }}>
        <img src={LOGO} alt="" style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 12 }}
          onError={(e) => { e.target.style.visibility = 'hidden' }} />
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Municipality of Alaminos</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Purchase Request &amp; Inventory Management System</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 720, width: '100%' }}>
          <Link to="/purchase-request" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 18px',
              background: 'rgba(122,30,42,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 32, color: 'var(--maroon)' }} />
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Submit a Purchase Request</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Fill out a request for items needed by your department.</p>
          </Link>

          <Link to="/track-request" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 18px',
              background: 'rgba(26,74,122,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 32, color: '#1a4a7a' }} />
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Track a Purchase Request</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Check the status of a request using its PR number.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
