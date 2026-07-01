import { NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge, faFileLines, faBoxOpen, faTags,
  faFileInvoiceDollar, faClockRotateLeft, faGear, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../context/AuthContext'
import LOGO from '../assets/alaminos-seal.jpeg'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: faGauge },
  { to: '/admin/requests', label: 'Purchase Requests', icon: faFileLines },
  { to: '/admin/inventory', label: 'Inventory', icon: faBoxOpen },
  { to: '/admin/categories', label: 'Categories', icon: faTags },
  { to: '/admin/purchase-orders', label: 'Purchase Orders', icon: faFileInvoiceDollar },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: faClockRotateLeft },
  { to: '/admin/settings', label: 'Settings', icon: faGear },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={LOGO} alt="Alaminos seal" className="sidebar-logo" onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div className="sidebar-header-text">
            <div className="org">Municipality of Alaminos</div>
            <div className="title">General Services Office (GSO)</div>
            <div className="subtitle">Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <FontAwesomeIcon icon={item.icon} style={{ width: 16, flexShrink: 0 }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-name">{profile?.full_name || 'User'}</div>
          <div className="sidebar-user-role">{profile?.role?.toUpperCase() || 'STAFF'}</div>
          <button className="btn-signout" onClick={handleSignOut}><FontAwesomeIcon icon={faRightFromBracket} style={{ marginRight: 6 }} />Sign out</button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
            <span>Purchase Request &amp; Inventory Management System</span>
          </div>
          <div className="topbar-date">{today}</div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
