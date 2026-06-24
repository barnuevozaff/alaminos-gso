import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'

export default function PurchaseRequestsList() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setRequests(data || [])
    setLoading(false)
  }

  const filtered = requests.filter((r) => {
    const matchesSearch = !search ||
      r.pr_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Purchase Requests</h1>
          <p className="page-subtitle">Submitted by departments. Review and approve or reject.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/requests/new')}>+ New Request</button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="form-input"
          placeholder="Search PR # or requester…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select>
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No purchase requests found</div>
            Try adjusting your search or filters, or create a new request.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PR Number</th>
                <th>Date</th>
                <th>Requester</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.pr_number}</strong></td>
                  <td>{new Date(r.pr_date).toLocaleDateString()}</td>
                  <td>{r.requester_name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/requests/${r.id}`)}>👁 View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
