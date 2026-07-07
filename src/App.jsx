import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import PublicHome from './pages/PublicHome'
import PublicPurchaseRequestForm from './pages/PublicPurchaseRequestForm'
import TrackRequest from './pages/TrackRequest'
import PublicRequisitionIssueSlipForm from './pages/PublicRequisitionIssueSlipForm'
import TrackRequisitionIssueSlip from './pages/TrackRequisitionIssueSlip'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PurchaseRequestsList from './pages/PurchaseRequestsList'
import PurchaseRequestForm from './pages/PurchaseRequestForm'
import PurchaseRequestDetail from './pages/PurchaseRequestDetail'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'
import PurchaseOrdersList from './pages/PurchaseOrdersList'
import PurchaseOrderForm from './pages/PurchaseOrderForm'
import PurchaseOrderDetail from './pages/PurchaseOrderDetail'
import RisRequestsList from './pages/RisRequestsList'
import RisRequestDetail from './pages/RisRequestDetail'
import RisInventory from './pages/RisInventory'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="state-box"><div className="spinner"></div>Loading…</div>
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* ================= PUBLIC PORTAL =================
          No login required. No admin sidebar, menu, or login
          button appears anywhere in this section. Completely
          separate pages/components from the Admin Portal below. */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/purchase-request" element={<PublicPurchaseRequestForm />} />
      <Route path="/track-request" element={<TrackRequest />} />
      <Route path="/requisition-issue-slip" element={<PublicRequisitionIssueSlipForm />} />
      <Route path="/track-ris" element={<TrackRequisitionIssueSlip />} />

      {/* ================= ADMIN PORTAL =================
          Everything lives under /admin. Login is never linked
          from the Public Portal — accessed only by typing the
          URL directly. */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin/requests" element={<PrivateRoute><PurchaseRequestsList /></PrivateRoute>} />
      <Route path="/admin/requests/new" element={<PrivateRoute><PurchaseRequestForm /></PrivateRoute>} />
      <Route path="/admin/requests/:id" element={<PrivateRoute><PurchaseRequestDetail /></PrivateRoute>} />
      <Route path="/admin/requests/:id/edit" element={<PrivateRoute><PurchaseRequestForm /></PrivateRoute>} />
      <Route path="/admin/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/admin/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
      <Route path="/admin/purchase-orders" element={<PrivateRoute><PurchaseOrdersList /></PrivateRoute>} />
      <Route path="/admin/purchase-orders/new" element={<PrivateRoute><PurchaseOrderForm /></PrivateRoute>} />
      <Route path="/admin/purchase-orders/:id" element={<PrivateRoute><PurchaseOrderDetail /></PrivateRoute>} />
      <Route path="/admin/ris" element={<PrivateRoute><RisRequestsList /></PrivateRoute>} />
      <Route path="/admin/ris/:id" element={<PrivateRoute><RisRequestDetail /></PrivateRoute>} />
      <Route path="/admin/ris-inventory" element={<PrivateRoute><RisInventory /></PrivateRoute>} />
      <Route path="/admin/audit-logs" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
      <Route path="/admin/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

      {/* Legacy redirects in case anything still links to the old
          non-prefixed admin paths */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/requests" element={<Navigate to="/admin/requests" replace />} />
      <Route path="/inventory" element={<Navigate to="/admin/inventory" replace />} />
      <Route path="/categories" element={<Navigate to="/admin/categories" replace />} />
      <Route path="/purchase-orders" element={<Navigate to="/admin/purchase-orders" replace />} />
      <Route path="/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/submit" element={<Navigate to="/purchase-request" replace />} />
      <Route path="/track" element={<Navigate to="/track-request" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
