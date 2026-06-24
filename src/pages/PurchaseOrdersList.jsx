import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'

export default function PurchaseOrdersList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('purchase_orders')
      .select('*, purchase_requests(pr_number)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [])

  return (
    <Layout>
      <h1 className="page-title">Purchase Orders</h1>
      <p className="page-subtitle">Generated from approved purchase requests.</p>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading purchase orders…</div>
        ) : orders.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No purchase orders yet</div>
            Generate one from an approved purchase request.
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>PO Number</th><th>Linked PR</th><th>Supplier</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td><strong>{po.po_number}</strong></td>
                  <td>{po.purchase_requests?.pr_number || '—'}</td>
                  <td>{po.supplier || <span className="text-muted">Not set</span>}</td>
                  <td>{new Date(po.po_date).toLocaleDateString()}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => navigate(`/purchase-orders/${po.id}`)}>👁 View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
