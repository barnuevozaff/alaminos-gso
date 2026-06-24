import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PurchaseRequestsList from './pages/PurchaseRequestsList'
import PurchaseRequestForm from './pages/PurchaseRequestForm'
import PurchaseRequestDetail from './pages/PurchaseRequestDetail'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import AuditLogs from './pages/AuditLogs'
import PurchaseOrdersList from './pages/PurchaseOrdersList'
import PurchaseOrderDetail from './pages/PurchaseOrderDetail'
import AIRDetail from './pages/AIRDetail'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="state-box"><div className="spinner"></div>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/requests" element={<PrivateRoute><PurchaseRequestsList /></PrivateRoute>} />
      <Route path="/requests/new" element={<PrivateRoute><PurchaseRequestForm /></PrivateRoute>} />
      <Route path="/requests/:id" element={<PrivateRoute><PurchaseRequestDetail /></PrivateRoute>} />
      <Route path="/requests/:id/edit" element={<PrivateRoute><PurchaseRequestForm /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
      <Route path="/purchase-orders" element={<PrivateRoute><PurchaseOrdersList /></PrivateRoute>} />
      <Route path="/purchase-orders/:id" element={<PrivateRoute><PurchaseOrderDetail /></PrivateRoute>} />
      <Route path="/air/:id" element={<PrivateRoute><AIRDetail /></PrivateRoute>} />
      <Route path="/audit-logs" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
