import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [{ count: total }, { count: pending }, { count: approved }, { count: rejected },
           { count: invItems }, { data: lowStock }, { count: poCount }, { data: requestsToday }] = await Promise.all([
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Submitted'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('inventory').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('id').lte('quantity', 10),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('id').gte('created_at', new Date().toISOString().slice(0, 10)),
    ])

    setStats({
      total: total || 0,
      pending: pending || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      invItems: invItems || 0,
      lowStock: lowStock?.length || 0,
      poCount: poCount || 0,
      requestsToday: requestsToday?.length || 0,
    })
    setLoading(false)
  }

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Welcome</h1>
          <p className="page-subtitle">Administrator overview</p>
        </div>
        <div className="gap-8">
          <button className="btn btn-primary" onClick={() => navigate('/requests/new')}>New Request</button>
          <button className="btn btn-secondary" onClick={() => navigate('/requests')}>View Requests</button>
        </div>
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner"></div>Loading dashboard…</div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard color="maroon" icon="📄" label="Total Requests" value={stats.total} />
            <StatCard color="gold" icon="⏰" label="Pending" value={stats.pending} />
            <StatCard color="green" icon="✔" label="Approved" value={stats.approved} />
            <StatCard color="red" icon="✕" label="Rejected" value={stats.rejected} />
          </div>
          <div className="stats-grid">
            <StatCard color="gold" icon="📄" label="Requests Today" value={stats.requestsToday} />
            <StatCard color="maroon" icon="📦" label="Inventory Items" value={stats.invItems} />
            <StatCard color="red" icon="⚠" label="Low Stock (≤10)" value={stats.lowStock} />
            <StatCard color="maroon" icon="🛒" label="Purchase Orders" value={stats.poCount} />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Quick Tips</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9, color: 'var(--text-muted)' }}>
              <li>Create a new purchase request by clicking <strong>New Request</strong>.</li>
              <li>Stock availability is validated before you can submit.</li>
              <li>Approve a request to automatically deduct the requested quantity from inventory.</li>
            </ul>
          </div>
        </>
      )}
    </Layout>
  )
}

function StatCard({ color, icon, label, value }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-head"><span>{label}</span><span>{icon}</span></div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
