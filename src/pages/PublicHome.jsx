import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faMagnifyingGlass, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import LOGO from '../assets/alaminos-seal.png'

export default function PublicHome() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fdf8f6 0%, #f5ede8 50%, #f0e8f0 100%)' }}>

      {/* Topbar */}
      <div className="public-topbar">
        <div className="public-topbar-brand">
          <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div className="org-name" style={{ color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Municipality of Alaminos</div>
            <div className="gso-name" style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
            <div className="sys-name" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(122,30,42,0.08)', border: '1px solid rgba(122,30,42,0.18)',
          borderRadius: 99, padding: '6px 16px', marginBottom: 24,
          fontSize: 12, fontWeight: 600, color: 'var(--maroon)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--maroon)', display: 'inline-block' }} />
          Official GSO Portal
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 14px', lineHeight: 1.2, color: '#1a1210' }}>
          Purchase Request &amp;<br />Inventory Management
        </h1>
        <p style={{ fontSize: 16, color: '#6b6260', margin: '0 auto', maxWidth: 480, lineHeight: 1.7 }}>
          Submit purchase requests and track their status — all in one place for the Municipality of Alaminos, Laguna.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24, maxWidth: 760, margin: '0 auto', padding: '0 24px 80px',
      }}>
        <ActionCard
          to="/purchase-request"
          icon={faFileLines}
          iconBg="linear-gradient(135deg, #7a1e2a 0%, #a8293a 100%)"
          iconShadow="rgba(122,30,42,0.35)"
          title="Submit a Purchase Request"
          description="Fill out a request for items needed by your department. The GSO will review and process it."
          label="Submit Request"
          accentColor="#7a1e2a"
        />
        <ActionCard
          to="/track-request"
          icon={faMagnifyingGlass}
          iconBg="linear-gradient(135deg, #1a4a7a 0%, #2563a8 100%)"
          iconShadow="rgba(26,74,122,0.35)"
          title="Track a Purchase Request"
          description="Check the current status of your submitted request using its PR number."
          label="Track Request"
          accentColor="#1a4a7a"
        />
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 0 32px', fontSize: 12, color: '#a09090' }}>
        Municipality of Alaminos · General Services Office · {new Date().getFullYear()}
      </div>
    </div>
  )
}

function ActionCard({ to, icon, iconBg, iconShadow, title, description, label, accentColor }) {
  return (
    <Link
      to={to}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)'
          e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.12), 0 0 0 2px ${accentColor}22`
          e.currentTarget.style.borderColor = `${accentColor}40`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'
        }}
      >
        {/* Subtle top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: iconBg, opacity: 0.7, borderRadius: '20px 20px 0 0',
        }} />

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18, marginBottom: 24,
          background: iconBg,
          boxShadow: `0 8px 24px ${iconShadow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 26, color: '#fff' }} />
        </div>

        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#1a1210', lineHeight: 1.3 }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b6260', lineHeight: 1.65 }}>
          {description}
        </p>

        {/* CTA */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 700, color: accentColor,
        }}>
          {label}
          <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 11, transition: 'transform 0.2s' }} />
        </div>
      </div>
    </Link>
  )
}
