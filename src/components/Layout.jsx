import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Ph_seal_alaminos_laguna.png/120px-Ph_seal_alaminos_laguna.png'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬛' },
  { to: '/requests', label: 'Purchase Requests', icon: '📄' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/categories', label: 'Categories', icon: '🏷' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: '🛒' },
  { to: '/audit-logs', label: 'Audit Logs', icon: '📋' },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
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
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-name">{profile?.full_name || 'User'}</div>
          <div className="sidebar-user-role">{profile?.role?.toUpperCase() || 'STAFF'}</div>
          <button className="btn-signout" onClick={handleSignOut}>⏏ Sign out</button>
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
