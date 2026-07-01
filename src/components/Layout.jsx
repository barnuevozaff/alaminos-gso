import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge, faFileLines, faBoxOpen, faTags,
  faFileInvoiceDollar, faClockRotateLeft, faGear, faRightFromBracket,
  faBars, faXmark,
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  function closeSidebar() { setSidebarOpen(false) }

  return (
    <div className="app-shell">
      {/* Overlay — click to close sidebar on mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
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
              onClick={closeSidebar}
            >
              <FontAwesomeIcon icon={item.icon} style={{ width: 16, flexShrink: 0 }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-name">{profile?.full_name || 'User'}</div>
          <div className="sidebar-user-role">{profile?.role?.toUpperCase() || 'STAFF'}</div>
          <button className="btn-signout" onClick={handleSignOut}>
            <FontAwesomeIcon icon={faRightFromBracket} style={{ marginRight: 6 }} />Sign out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
              <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} />
            </button>
            <div className="topbar-title">
              <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
              <span>Purchase Request &amp; Inventory Management System</span>
            </div>
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
