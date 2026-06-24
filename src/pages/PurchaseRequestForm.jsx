import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import ItemAutocomplete from '../components/ItemAutocomplete'

export default function PurchaseRequestForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    department: profile?.department || '',
    requester_name: profile?.full_name || '',
    purpose: '',
    fund: 'General Fund',
  })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Draft')

  useEffect(() => {
    if (isEdit) loadExisting()
  }, [id])

  async function loadExisting() {
    setLoading(true)
    const { data: pr } = await supabase.from('purchase_requests').select('*').eq('id', id).single()
    const { data: prItems } = await supabase.from('pr_items').select('*').eq('pr_id', id).order('sort_order')
    if (pr) {
      setForm({ department: pr.department, requester_name: pr.requester_name, purpose: pr.purpose || '', fund: pr.fund })
      setStatus(pr.status)
    }
    setItems(prItems || [])
    setLoading(false)
  }

  function addInventoryItem(invItem) {
    setItems((prev) => [...prev, {
      inventory_id: invItem.id,
      item_code: invItem.item_code,
      item_description: invItem.item_name,
      unit: invItem.unit,
      quantity: 1,
      unit_cost: invItem.unit_cost,
      _stock: invItem.quantity,
    }])
  }

  function addBlankItem() {
    setItems((prev) => [...prev, {
      inventory_id: null, item_code: '', item_description: '', unit: '', quantity: 1, unit_cost: 0,
    }])
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const grandTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0)

  function validate() {
    if (!form.department.trim()) return 'Department is required.'
    if (!form.requester_name.trim()) return 'Requester is required.'
    if (items.length === 0) return 'Add at least one item.'
    for (const it of items) {
      if (!it.item_description?.trim()) return 'Every item needs a description.'
      if (!it.unit?.trim()) return 'Every item needs a unit.'
      if (!it.quantity || Number(it.quantity) <= 0) return 'Quantity must be greater than zero.'
      if (it.inventory_id && it._stock !== undefined && Number(it.quantity) > it._stock) {
        return `Requested quantity for "${it.item_description}" exceeds available stock (${it._stock}).`
      }
    }
    return ''
  }

  async function handleSave(targetStatus) {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSaving(true)

    try {
      let prId = id
      const payload = { ...form, status: targetStatus }
      if (targetStatus === 'Submitted') payload.submitted_at = new Date().toISOString()

      if (isEdit) {
        const { error: updErr } = await supabase.from('purchase_requests').update(payload).eq('id', id)
        if (updErr) throw updErr
        await supabase.from('pr_items').delete().eq('pr_id', id)
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('purchase_requests')
          .insert({ ...payload, requester_id: user?.id })
          .select()
          .single()
        if (insErr) throw insErr
        prId = inserted.id
      }

      const itemRows = items.map((it, idx) => ({
        pr_id: prId,
        inventory_id: it.inventory_id || null,
        item_code: it.item_code || null,
        item_description: it.item_description,
        unit: it.unit,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost) || 0,
        sort_order: idx,
      }))
      const { error: itemsErr } = await supabase.from('pr_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      navigate(`/requests/${prId}`)
    } catch (e) {
      setError(e.message || 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Layout><div className="state-box"><div className="spinner"></div>Loading…</div></Layout>
  }

  const isLocked = isEdit && status !== 'Draft'

  return (
    <Layout>
      <h1 className="page-title">{isEdit ? 'Edit Purchase Request' : 'New Purchase Request'}</h1>
      <p className="page-subtitle">Fill in the details below, add items, then save as draft or submit for approval.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {isLocked && <div className="alert alert-error">This request has already been {status.toLowerCase()} and can no longer be edited.</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={form.department} disabled={isLocked}
              onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. MENRO" />
          </div>
          <div className="form-group">
            <label className="form-label">Requester</label>
            <input className="form-input" value={form.requester_name} disabled={isLocked}
              onChange={(e) => setForm({ ...form, requester_name: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fund</label>
            <input className="form-input" value={form.fund} disabled={isLocked}
              onChange={(e) => setForm({ ...form, fund: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose / Justification</label>
            <input className="form-input" value={form.purpose} disabled={isLocked}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
        </div>
      </div>

      {!isLocked && (
        <div className="card" style={{ marginBottom: 20 }}>
          <label className="form-label">Search inventory to add an item</label>
          <ItemAutocomplete onSelect={addInventoryItem} excludeIds={items.map((i) => i.inventory_id).filter(Boolean)} />
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={addBlankItem}>+ Add custom item (not in inventory)</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table line-items-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total</th>
              {!isLocked && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No items added yet.</td></tr>
            ) : items.map((it, idx) => (
              <tr key={idx}>
                <td><input value={it.unit} disabled={isLocked} onChange={(e) => updateItem(idx, 'unit', e.target.value)} /></td>
                <td><input value={it.item_description} disabled={isLocked} onChange={(e) => updateItem(idx, 'item_description', e.target.value)} /></td>
                <td>
                  <input type="number" min="0" step="any" value={it.quantity} disabled={isLocked}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  {it._stock !== undefined && <div className="form-hint">stock: {it._stock}</div>}
                </td>
                <td><input type="number" min="0" step="0.01" value={it.unit_cost} disabled={isLocked} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} /></td>
                <td>₱{((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0)).toFixed(2)}</td>
                {!isLocked && <td><button className="icon-btn danger" onClick={() => removeItem(idx)}>🗑</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 0 && (
          <div style={{ padding: 14, textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border)' }}>
            Grand Total: ₱{grandTotal.toFixed(2)}
          </div>
        )}
      </div>

      {!isLocked && (
        <div className="print-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-outline" disabled={saving} onClick={() => handleSave('Draft')}>Save as Draft</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => handleSave('Submitted')}>
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      )}
    </Layout>
  )
}
