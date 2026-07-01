import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function Categories() {
  const toast = useToast()
  const [categories, setCategories] = useState([])
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
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) setError(error.message)
    setCategories(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setError('')
    const duplicate = categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())
    if (duplicate) { setError(`A category named "${name.trim()}" already exists.`); return }
    const { error } = await supabase.from('categories').insert({ name: name.trim() })
    if (error) { setError(error.message); return }
    setName('')
    toast.success(`Category "${name.trim()}" added.`)
    load()
  }

  async function handleUpdate(id) {
    if (!editingName.trim()) return
    setError('')
    const duplicate = categories.find((c) => c.name.toLowerCase() === editingName.trim().toLowerCase() && c.id !== id)
    if (duplicate) { setError(`A category named "${editingName.trim()}" already exists.`); return }
    const { error } = await supabase.from('categories').update({ name: editingName.trim() }).eq('id', id)
    if (error) { setError(error.message); return }
    setEditingId(null)
    toast.success('Category updated.')
    load()
  }

  async function confirmDelete(cat) {
    const { count } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id)
    setDeleteAffectedCount(count || 0)
    setDeleteTarget(cat)
  }

  async function handleDelete() {
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id)
    if (error) { setError(error.message); setDeleteTarget(null); setDeleteAffectedCount(0); return }
    toast.success(`Category "${deleteTarget.name}" deleted.`)
    setDeleteTarget(null)
    setDeleteAffectedCount(0)
    load()
  }

  return (
    <Layout>
      <h1 className="page-title">Categories</h1>
      <p className="page-subtitle">Organize inventory items into categories.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Add Category</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Category name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading categories…</div>
        ) : (
          <table className="data-table">
            <thead><tr><th style={{ width: '100%' }}>Name</th><th style={{ whiteSpace: 'nowrap', minWidth: 160 }}>Actions</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    {editingId === c.id ? (
                      <input className="form-input" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)} autoFocus />
                    ) : c.name}
                  </td>
                  <td>
                    {editingId === c.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleUpdate(c.id)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <button className="btn btn-outline btn-sm" aria-label={`Edit ${c.name}`} onClick={() => { setEditingId(c.id); setEditingName(c.name) }}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Edit</button>
                        <button className="btn btn-danger btn-sm" aria-label={`Delete ${c.name}`} onClick={() => confirmDelete(c)}><FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete</button>
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
          title="Delete this category?"
          message={
            deleteAffectedCount > 0
              ? `"${deleteTarget.name}" will be removed. ${deleteAffectedCount} inventory item${deleteAffectedCount > 1 ? 's' : ''} will lose their category label. This cannot be undone.`
              : `"${deleteTarget.name}" will be permanently removed.`
          }
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteAffectedCount(0) }}
        />
      )}
    </Layout>
  )
}
