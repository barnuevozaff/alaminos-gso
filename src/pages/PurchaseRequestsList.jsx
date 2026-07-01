import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faTrash, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PurchaseRequestsList() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
    setSelectedIds([])
    setDeleteMode(false)
    setLoading(false)
  }

  const filtered = requests.filter((r) => {
    const matchesSearch = !search ||
      r.pr_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : filtered.map((r) => r.id))
  }

  async function handleBulkDelete() {
    setDeleting(true)
    setError('')
    // Sever any old PO links to these PRs first (from before PO/PR were decoupled) —
    // this keeps the Purchase Order itself, just clears the now-defunct reference,
    // so the foreign key no longer blocks deleting the request.
    await supabase.from('purchase_orders').update({ pr_id: null }).in('pr_id', selectedIds)
    const { error } = await supabase.from('purchase_requests').delete().in('id', selectedIds)
    setDeleting(false)
    setConfirmBulkDelete(false)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Purchase Requests</h1>
          <p className="page-subtitle">Submitted by departments. Review and approve or reject.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/requests/new')}><FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />New Request</button>
      </div>

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="gap-8">
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
        <div className="gap-8">
          {!deleteMode ? (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteMode(true)}>
              <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete
            </button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={toggleSelectAll}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={selectedIds.length === 0}
                onClick={() => setConfirmBulkDelete(true)}
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setDeleteMode(false); setSelectedIds([]) }}>
                <FontAwesomeIcon icon={faXmark} style={{ marginRight: 6 }} />Cancel
              </button>
            </>
          )}
        </div>
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
                {deleteMode && <th style={{ width: 40 }}></th>}
                <th>PR Number</th>
                <th>Date</th>
                <th>Requester</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={deleteMode ? () => toggleSelect(r.id) : undefined}
                  style={deleteMode ? { cursor: 'pointer', background: selectedIds.includes(r.id) ? 'rgba(185,28,28,0.07)' : undefined } : undefined}
                >
                  {deleteMode && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                  )}
                  <td><strong>{r.pr_number}</strong></td>
                  <td>{new Date(r.pr_date).toLocaleDateString()}</td>
                  <td>{r.requester_name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {!deleteMode && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/requests/${r.id}`)}><FontAwesomeIcon icon={faEye} style={{ marginRight: 6 }} />View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Delete ${selectedIds.length} purchase request${selectedIds.length > 1 ? 's' : ''}?`}
          message="This permanently removes the selected requests and their items, including any that are Approved or Rejected — their audit history (who requested, who decided) will be lost. This cannot be undone."
          confirmLabel="Delete"
          confirmClass="btn-danger"
          busy={deleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </Layout>
  )
}
