import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPenToSquare, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { UNITS } from '../lib/units'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: inv, error: invErr }, { data: cats }] = await Promise.all([
      supabase.from('inventory').select('*, categories(name)').order('item_name'),
      supabase.from('categories').select('*').order('name'),
    ])
    if (invErr) setError(invErr.message)
    setItems(inv || [])
    setCategories(cats || [])
    setLoading(false)
  }

  const filtered = items.filter((i) => {
    const matchesSearch = !search || i.item_name.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || i.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  async function handleDelete() {
    const { error } = await supabase.from('inventory').delete().eq('id', deleteTarget.id)
    if (error) setError(error.message)
    setDeleteTarget(null)
    load()
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage items, units, stock, and prices.</p>
        </div>
      </div>

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="gap-8">
          <input className="form-input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}><FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Add Item</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No items found</div>
            Add your first inventory item to get started.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Item</th><th>Category</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.item_name}</strong><div className="text-muted" style={{ fontSize: 12 }}>{item.item_code}</div></td>
                  <td>{item.categories?.name || '—'}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                  <td>₱{Number(item.unit_cost).toFixed(2)}</td>
                  <td>₱{(item.quantity * item.unit_cost).toFixed(2)}</td>
                  <td className="gap-8">
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditing(item); setShowModal(true) }}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(item)}><FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ItemModal
          item={editing}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this item?"
          message={`"${deleteTarget.item_name}" will be permanently removed from inventory.`}
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  )
}

function ItemModal({ item, categories, onClose, onSaved }) {
  const [name, setName] = useState(item?.item_name || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '')
  const [unit, setUnit] = useState(item?.unit || 'piece')
  const [quantity, setQuantity] = useState(item?.quantity ?? 0)
  const [unitCost, setUnitCost] = useState(item?.unit_cost ?? 0)
  const [reorderLevel, setReorderLevel] = useState(item?.reorder_level ?? 10)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0)

  async function handleSave() {
    if (!name.trim()) { setError('Item name is required.'); return }
    setSaving(true)
    setError('')
    const payload = {
      item_name: name, category_id: categoryId || null, unit,
      quantity: Number(quantity), unit_cost: Number(unitCost), reorder_level: Number(reorderLevel),
    }
    const { error } = item
      ? await supabase.from('inventory').update(payload).eq('id', item.id)
      : await supabase.from('inventory').insert(payload)
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">{item ? 'Edit Item' : 'Add Item'}</h3>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Item Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Unit Cost (₱)</label>
            <input type="number" step="0.01" className="form-input" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Reorder Level</label>
          <input type="number" className="form-input" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          <div className="form-hint">Item is flagged as low stock at or below this quantity.</div>
        </div>

        <p className="text-muted">Total Cost: ₱{totalCost.toFixed(2)}</p>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
