import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Boxes, Tags,
  FileSpreadsheet, ScrollText, Settings, LogOut,
  Menu, X, ShoppingCart, ChevronDown, ClipboardList, ReceiptText, Warehouse,
  Building2, ListChecks, CalendarRange, Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import LOGO from '../assets/alaminos-seal.png'

const NAV_ITEMS = [
  {
    type: 'section',
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    type: 'group',
    sectionLabel: 'Procurement',
    label: 'Purchase Request',
    icon: ShoppingCart,
    children: [
      { to: '/admin/requests', label: 'Purchase Requests', icon: FileText },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/purchase-orders', label: 'Purchase Orders', icon: FileSpreadsheet },
    ],
  },
  {
    type: 'group',
    sectionLabel: 'Requisition',
    label: 'Requisition Slip',
    icon: ClipboardList,
    children: [
      { to: '/admin/ris', label: 'Requisition Slips', icon: FileText },
      { to: '/admin/ris-categories', label: 'RIS Categories', icon: Tags },
      { to: '/admin/rsmi-report', label: 'RSMI Report', icon: ReceiptText },
    ],
  },
  {
    type: 'group',
    sectionLabel: 'Facilities',
    label: 'Facility Booking',
    icon: Building2,
    children: [
      { to: '/admin/facility-reservations', label: 'Reservations', icon: ListChecks },
      { to: '/admin/facility-calendar', label: 'Calendar', icon: CalendarRange },
      { to: '/admin/facility-management', label: 'Manage Facilities', icon: Tags },
    ],
  },
  {
    type: 'group',
    sectionLabel: 'Utilities',
    label: 'Energy Consumption',
    icon: Zap,
    children: [
      { to: '/admin/energy-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/energy-accounts', label: 'Accounts', icon: Tags },
      { to: '/admin/energy-report', label: 'Report', icon: FileSpreadsheet },
    ],
  },
  {
    type: 'section',
    label: 'Assets',
    items: [
      { to: '/admin/inventory', label: 'PR Inventory', icon: Boxes },
      { to: '/admin/ris-inventory', label: 'RIS Inventory', icon: Warehouse },
    ],
  },
  {
    type: 'section',
    label: 'System',
    items: [
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const groupHasActiveChild = (item) =>
    item.children?.some((child) => location.pathname.startsWith(child.to))

  const [openGroup, setOpenGroup] = useState(() => {
    const active = NAV_ITEMS.find((item) => item.type === 'group' && groupHasActiveChild(item))
    return active?.label ?? null
  })

  useEffect(() => {
    const active = NAV_ITEMS.find((item) => item.type === 'group' && groupHasActiveChild(item))
    if (active) setOpenGroup(active.label)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(label) {
    setOpenGroup((prev) => (prev === label ? null : label))
  }

  useEffect(() => {
    function handleOffline() { setIsOnline(false) }
    function handleOnline() {
      setIsOnline(true)
      toast.success('Back online. You\'re connected again.')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

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
            <div className="title">GSO System</div>
            <div className="subtitle">Municipality of Alaminos</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            if (item.type === 'section') {
              return (
                <div key={item.label} className="sidebar-section">
                  <div className="sidebar-section-label">{item.label}</div>
                  {item.items.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                      onClick={closeSidebar}
                    >
                      <link.icon size={18} style={{ flexShrink: 0 }} />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              )
            }

            // Collapsible dropdown group
            const isOpen = openGroup === item.label
            return (
              <div key={item.label} className="sidebar-section sidebar-group">
                {item.sectionLabel && <div className="sidebar-section-label">{item.sectionLabel}</div>}
                <button
                  type="button"
                  className={
                    'sidebar-link sidebar-group-toggle'
                    + (groupHasActiveChild(item) ? ' active-group' : '')
                    + (isOpen ? ' open' : '')
                  }
                  onClick={() => toggleGroup(item.label)}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  <span>{item.label}</span>
                  <ChevronDown
                    size={14}
                    className="sidebar-group-chevron"
                    style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                <div className={'sidebar-submenu-wrapper' + (isOpen ? ' open' : '')}>
                  <div className="sidebar-submenu">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => 'sidebar-link sidebar-sublink' + (isActive ? ' active' : '')}
                        onClick={closeSidebar}
                      >
                        <child.icon size={18} style={{ flexShrink: 0 }} />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-name">{profile?.full_name || 'Administrator'}</div>
          <div className="sidebar-user-role">{profile?.role?.toUpperCase() || 'GSO ADMIN'}</div>
          <button className="btn-signout" onClick={handleSignOut}>
            <LogOut size={16} style={{ marginRight: 6 }} />Sign out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar-title">
              <span>Purchase Request &amp; Inventory Management System</span>
            </div>
          </div>
        </div>
        {!isOnline && (
          <div style={{
            background: '#92400e', color: '#fff',
            padding: '10px 20px', textAlign: 'center',
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span>⚡</span>
            You are offline — changes will not be saved until your connection is restored.
          </div>
        )}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
