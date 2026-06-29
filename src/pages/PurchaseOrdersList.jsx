import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PurchaseOrdersList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    supabase
      .from('purchase_orders')
      .select('*, purchase_requests(pr_number)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }

  async function handleDelete() {
    const { error } = await supabase.from('purchase_orders').delete().eq('id', deleteTarget.id)
    if (error) setError(error.message)
    setDeleteTarget(null)
    load()
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Sent to suppliers for goods/services.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/purchase-orders/new')}>+ New Purchase Order</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading purchase orders…</div>
        ) : orders.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No purchase orders yet</div>
            Click "+ New Purchase Order" above to create one.
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>PO Number</th><th>PR No./s</th><th>Supplier</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td><strong>{po.po_number}</strong></td>
                  <td>{po.pr_numbers || po.purchase_requests?.pr_number || '—'}</td>
                  <td>{po.supplier || <span className="text-muted">Not set</span>}</td>
                  <td>{new Date(po.po_date).toLocaleDateString()}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td className="gap-8">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/purchase-orders/${po.id}`)}>👁 View</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(po)}>🗑 Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this purchase order?"
          message={`"${deleteTarget.po_number}" and its items will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  )
}
