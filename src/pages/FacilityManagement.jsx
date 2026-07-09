import { useEffect, useState } from 'react'
import { Trash2, SquarePen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function FacilityManagement() {
  const toast = useToast()
  const [facilities, setFacilities] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteAffectedCount, setDeleteAffectedCount] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('facilities').select('*').order('name')
    if (error) setError(error.message)
    setFacilities(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setError('')
    const duplicate = facilities.find((f) => f.name.toLowerCase() === name.trim().toLowerCase())
    if (duplicate) { setError(`A facility named "${name.trim()}" already exists.`); return }
    const { error } = await supabase.from('facilities').insert({ name: name.trim() })
    if (error) { setError(error.message); return }
    setName('')
    toast.success(`Facility "${name.trim()}" added.`)
    load()
  }

  async function handleUpdate(id) {
    if (!editingName.trim()) return
    setError('')
    const duplicate = facilities.find((f) => f.name.toLowerCase() === editingName.trim().toLowerCase() && f.id !== id)
    if (duplicate) { setError(`A facility named "${editingName.trim()}" already exists.`); return }
    const { error } = await supabase.from('facilities').update({ name: editingName.trim() }).eq('id', id)
    if (error) { setError(error.message); return }
    setEditingId(null)
    toast.success('Facility updated.')
    load()
  }

  async function confirmDelete(facility) {
    const { count } = await supabase
      .from('facility_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('facility_id', facility.id)
    setDeleteAffectedCount(count || 0)
    setDeleteTarget(facility)
  }

  async function handleDelete() {
    if (deleteAffectedCount > 0) {
      setError(`Cannot delete "${deleteTarget.name}" — ${deleteAffectedCount} reservation${deleteAffectedCount > 1 ? 's' : ''} still reference it.`)
      setDeleteTarget(null)
      setDeleteAffectedCount(0)
      return
    }
    const { error } = await supabase.from('facilities').delete().eq('id', deleteTarget.id)
    if (error) { setError(error.message); setDeleteTarget(null); setDeleteAffectedCount(0); return }
    toast.success(`Facility "${deleteTarget.name}" deleted.`)
    setDeleteTarget(null)
    setDeleteAffectedCount(0)
    load()
  }

  return (
    <Layout>
      <h1 className="page-title">Manage Facilities</h1>
      <p className="page-subtitle">Facilities available for public reservation.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Add Facility</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Facility name, e.g. Gym 3"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading facilities…</div>
        ) : facilities.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No facilities yet</div>
            Add one above to make it available for reservation.
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th style={{ width: '100%' }}>Name</th><th style={{ whiteSpace: 'nowrap', minWidth: 160 }}>Actions</th></tr></thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id}>
                  <td>
                    {editingId === f.id ? (
                      <input className="form-input" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(f.id)} autoFocus />
                    ) : f.name}
                  </td>
                  <td>
                    {editingId === f.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleUpdate(f.id)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <button className="btn btn-outline btn-sm" aria-label={`Edit ${f.name}`} onClick={() => { setEditingId(f.id); setEditingName(f.name) }}><SquarePen size={16} style={{ marginRight: 6 }} />Edit</button>
                        <button className="btn btn-danger btn-sm" aria-label={`Delete ${f.name}`} onClick={() => confirmDelete(f)}><Trash2 size={16} style={{ marginRight: 6 }} />Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this facility?"
          message={
            deleteAffectedCount > 0
              ? `"${deleteTarget.name}" cannot be deleted — ${deleteAffectedCount} reservation${deleteAffectedCount > 1 ? 's' : ''} still reference it.`
              : `"${deleteTarget.name}" will be permanently removed.`
          }
          confirmLabel={deleteAffectedCount > 0 ? 'OK' : 'Delete'}
          confirmClass={deleteAffectedCount > 0 ? 'btn-secondary' : 'btn-danger'}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteAffectedCount(0) }}
        />
      )}
    </Layout>
  )
}
