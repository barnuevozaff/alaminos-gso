import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { fmtDate } from '../lib/dateUtils'
import { Eye, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'

export default function RisRequestsList() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All')
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
      .from('requisition_issue_slips')
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
      r.ris_number?.toLowerCase().includes(search.toLowerCase()) ||
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

    // Restore RIS inventory stock for any Approved slips being deleted —
    // they already had their stock deducted, so deleting must reverse that.
    const approvedIds = selectedIds.filter((id) => {
      const ris = requests.find((r) => r.id === id)
      return ris?.status === 'Approved'
    })
    if (approvedIds.length > 0) {
      const { data: itemsToRestore } = await supabase
        .from('ris_items')
        .select('ris_inventory_id, issued_quantity, quantity')
        .in('ris_id', approvedIds)
        .not('ris_inventory_id', 'is', null)
      if (itemsToRestore?.length) {
        for (const item of itemsToRestore) {
          const restoreQty = item.issued_quantity ?? item.quantity
          const { data: inv } = await supabase
            .from('ris_inventory')
            .select('quantity')
            .eq('id', item.ris_inventory_id)
            .single()
          if (inv) {
            await supabase
              .from('ris_inventory')
              .update({ quantity: inv.quantity + restoreQty })
              .eq('id', item.ris_inventory_id)
          }
        }
      }
    }

    const { error } = await supabase.from('requisition_issue_slips').delete().in('id', selectedIds)
    setDeleting(false)
    setConfirmBulkDelete(false)
    if (error) { setError(error.message); return }
    toast.success(`${selectedIds.length} requisition${selectedIds.length > 1 ? 's' : ''} deleted.`)
    load()
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Submitted Slips</h1>
          <p className="page-subtitle">Submitted by departments. Review and approve or reject.</p>
        </div>
      </div>

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="gap-8">
          <input
            type="text"
            className="form-input"
            placeholder="Search RIS # or requester…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
        <div className="gap-8">
          {!deleteMode ? (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteMode(true)}>
              <Trash2 size={16} style={{ marginRight: 6 }} />Delete
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
                <Trash2 size={16} style={{ marginRight: 6 }} />
                Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setDeleteMode(false); setSelectedIds([]) }}>
                <X size={16} style={{ marginRight: 6 }} />Cancel
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
            <div className="state-title">No requisition slips found</div>
            Try adjusting your search or filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {deleteMode && <th style={{ width: 40 }}></th>}
                <th>RIS Number</th>
                <th>Date</th>
                <th>Requester</th>
                <th>Office</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={deleteMode ? () => toggleSelect(r.id) : undefined}
                  style={deleteMode ? { cursor: 'pointer', background: selectedIds.includes(r.id) ? 'var(--danger-tint)' : undefined } : undefined}
                >
                  {deleteMode && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                  )}
                  <td><strong>{r.ris_number}</strong></td>
                  <td>{fmtDate(r.ris_date)}</td>
                  <td>{r.requester_name}</td>
                  <td>{r.office}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {!deleteMode && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/ris/${r.id}`)}><Eye size={16} style={{ marginRight: 6 }} />View</button>
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
          title={`Delete ${selectedIds.length} requisition${selectedIds.length > 1 ? 's' : ''}?`}
          message="This permanently removes the selected requisition slips and their items, including any that are Approved or Rejected — their audit history will be lost. This cannot be undone."
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
