import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    const { error } = await supabase.from('categories').insert({ name: name.trim() })
    if (error) { setError(error.message); return }
    setName('')
    load()
  }

  async function handleUpdate(id) {
    if (!editingName.trim()) return
    const { error } = await supabase.from('categories').update({ name: editingName.trim() }).eq('id', id)
    if (error) { setError(error.message); return }
    setEditingId(null)
    load()
  }

  async function handleDelete() {
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id)
    if (error) setError(error.message)
    setDeleteTarget(null)
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
            onChange={(e) => setName(e.target.value)}
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
            <thead><tr><th>Name</th><th>Actions</th></tr></thead>
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
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleUpdate(c.id)}>Save</button>{' '}
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <div className="gap-8">
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(c.id); setEditingName(c.name) }}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(c)}><FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete</button>
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
          message={`"${deleteTarget.name}" will be removed. Items already assigned to it will keep their data but lose the category label.`}
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  )
}
