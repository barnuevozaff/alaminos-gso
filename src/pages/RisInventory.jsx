import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPenToSquare, faPlus, faXmark, faFileArrowUp } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { UNITS } from '../lib/units'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'
import RisInventoryImportModal from '../components/RisInventoryImportModal'

export default function RisInventory() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get('filter') === 'lowstock' ? '__lowstock__' : 'all'
  )
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: inv, error: invErr }, { data: cats }] = await Promise.all([
      supabase.from('ris_inventory').select('*, ris_categories(name)').order('item_name'),
      supabase.from('ris_categories').select('*').order('name'),
    ])
    if (invErr) setError(invErr.message)
    setItems(inv || [])
    setCategories(cats || [])
    setLoading(false)
  }

  const othersCat = categories.find((c) => c.name.toLowerCase() === 'others')

  const isLowStock = (i) => i.quantity <= (i.reorder_level ?? 10)

  const filtered = items.filter((i) => {
    const matchesSearch = !search || i.item_name.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' ? true :
      categoryFilter === '__lowstock__' ? isLowStock(i) :
      i.category_id === categoryFilter ||
      (othersCat && categoryFilter === othersCat.id && !i.category_id)
    return matchesSearch && matchesCategory
  })

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : filtered.map((i) => i.id))
  }

  async function handleDelete() {
    await supabase.from('ris_items').update({ ris_inventory_id: null }).eq('ris_inventory_id', deleteTarget.id)
    const { error } = await supabase.from('ris_inventory').delete().eq('id', deleteTarget.id)
    if (error) { setError(error.message); setDeleteTarget(null); return }
    setDeleteTarget(null)
    toast.success('Item deleted.')
    load()
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    setError('')
    for (const id of selectedIds) {
      await supabase.from('ris_items').update({ ris_inventory_id: null }).eq('ris_inventory_id', id)
    }
    const { error } = await supabase.from('ris_inventory').delete().in('id', selectedIds)
    setBulkDeleting(false)
    setConfirmBulkDelete(false)
    if (error) { setError(error.message); return }
    setDeleteMode(false)
    setSelectedIds([])
    toast.success(`${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''} deleted.`)
    load()
  }

  return (
    <Layout>
      <div style={{
        position: 'sticky',
        top: 75,
        zIndex: 10,
        background: 'var(--bg)',
        paddingBottom: 12,
        marginBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="flex-between">
          <div>
            <h1 className="page-title">RIS Inventory</h1>
            <p className="page-subtitle" style={{ marginBottom: 12 }}>Stock available for Requisition and Issue Slips — separate from Purchase Request inventory.</p>
          </div>
        </div>

        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="gap-8">
          <input className="form-input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            <option value="__lowstock__">⚠ Low Stock only</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="gap-8">
          {!deleteMode ? (
            <>
              <button className="btn btn-secondary" onClick={() => setShowImport(true)}><FontAwesomeIcon icon={faFileArrowUp} style={{ marginRight: 6 }} />Scan / Upload</button>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteMode(true)}>
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete
              </button>
              <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}><FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Add Item</button>
            </>
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
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading RIS inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No items found</div>
            Add your first RIS inventory item to get started.
          </div>
        ) : (
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
              <tr>
                {deleteMode && <th style={{ width: 40 }}></th>}
                <th>Item</th><th>Category</th><th>Unit</th><th>Qty</th>
                {!deleteMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={deleteMode ? () => toggleSelect(item.id) : undefined}
                  style={deleteMode ? { cursor: 'pointer', background: selectedIds.includes(item.id) ? 'rgba(185,28,28,0.07)' : undefined } : undefined}
                >
                  {deleteMode && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                  )}
                  <td><strong>{item.item_name}</strong><div className="text-muted" style={{ fontSize: 12 }}>{item.item_code}</div></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span>{item.ris_categories?.name || '—'}</span>
                      {item.quantity <= (item.reorder_level ?? 10) && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, color: '#b45309',
                          background: 'rgba(180,83,9,0.1)', borderRadius: 4,
                          padding: '1px 6px', width: 'fit-content',
                        }}>
                          ⚠ Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{item.unit}</td>
                  <td style={{ color: item.quantity <= (item.reorder_level ?? 10) ? '#b45309' : undefined, fontWeight: item.quantity <= (item.reorder_level ?? 10) ? 700 : undefined }}>{item.quantity}</td>
                  {!deleteMode && (
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditing(item); setShowModal(true) }}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(item)}><FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RisItemModal
          item={editing}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); toast.success(editing ? 'Item updated.' : 'Item added.'); load() }}
        />
      )}

      {showImport && (
        <RisInventoryImportModal
          categories={categories}
          existingItems={items}
          onClose={() => setShowImport(false)}
          onSaved={() => { setShowImport(false); load() }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this item?"
          message={`"${deleteTarget.item_name}" will be permanently removed from RIS inventory.`}
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Delete ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}?`}
          message="Selected items will be permanently removed from RIS inventory. This cannot be undone."
          confirmLabel="Delete"
          confirmClass="btn-danger"
          busy={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </Layout>
  )
}

function RisItemModal({ item, categories, onClose, onSaved }) {
  const [name, setName] = useState(item?.item_name || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '')
  const [unit, setUnit] = useState(item?.unit || 'piece')
  const [quantity, setQuantity] = useState(item?.quantity ?? 0)
  const [reorderLevel, setReorderLevel] = useState(item?.reorder_level ?? 10)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Item name is required.'); return }
    if (Number(quantity) < 0) { setError('Quantity cannot be negative.'); return }
    if (Number(reorderLevel) < 0) { setError('Reorder level cannot be negative.'); return }
    setSaving(true)
    setError('')
    const payload = {
      item_name: name, category_id: categoryId || null, unit,
      quantity: Number(quantity), reorder_level: Number(reorderLevel),
    }
    const { error } = item
      ? await supabase.from('ris_inventory').update(payload).eq('id', item.id)
      : await supabase.from('ris_inventory').insert(payload)
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
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
            <label className="form-label">Reorder Level</label>
            <input type="number" className="form-input" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
        </div>
        <div className="form-hint">Item is flagged as low stock at or below the reorder level.</div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
