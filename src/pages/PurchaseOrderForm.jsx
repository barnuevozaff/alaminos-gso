import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { UNITS } from '../lib/units'
import Layout from '../components/Layout'

export default function PurchaseOrderForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [form, setForm] = useState({
    supplier: '',
    address: 'ALAMINOS, LAGUNA',
    tin: '',
    contact_number: '',
    po_date: new Date().toISOString().slice(0, 10),
    mode_of_procurement: '',
    pr_numbers: '',
    delivery_term: '7 working Days',
    payment_term: 'Cash',
    date_of_delivery: '',
    mayor_name: 'Hon. ERICSON R. LOPEZ',
    bac_secretary_name: 'NEMIA B. MONZONES',
  })
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addItem() {
    setItems((prev) => [...prev, { stock_property_no: String(prev.length + 1), unit: '', description: '', quantity: 1, unit_cost: 0 }])
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0)

  function validate() {
    if (!form.supplier.trim()) return 'Supplier is required.'
    if (items.length === 0) return 'Add at least one item.'
    for (const it of items) {
      if (!it.description.trim()) return 'Every item needs a description.'
      if (!it.quantity || Number(it.quantity) <= 0) return 'Quantity must be greater than zero.'
    }
    return ''
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSaving(true)

    try {
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          supplier: form.supplier,
          address: form.address || null,
          tin: form.tin || null,
          contact_number: form.contact_number || null,
          po_date: form.po_date,
          mode_of_procurement: form.mode_of_procurement || null,
          pr_numbers: form.pr_numbers || null,
          delivery_term: form.delivery_term || null,
          payment_term: form.payment_term || null,
          date_of_delivery: form.date_of_delivery || null,
          mayor_name: form.mayor_name || null,
          bac_secretary_name: form.bac_secretary_name || null,
          created_by: profile?.id,
        })
        .select()
        .single()
      if (poErr) throw poErr

      const itemRows = items.map((it, idx) => ({
        po_id: po.id,
        stock_property_no: it.stock_property_no || null,
        unit: it.unit,
        description: it.description,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost) || 0,
        sort_order: idx,
      }))
      const { error: itemsErr } = await supabase.from('po_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      navigate(`/admin/purchase-orders/${po.id}`)
    } catch (e) {
      setError(e.message || 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <h1 className="page-title">New Purchase Order</h1>
      <p className="page-subtitle">Fill in supplier and item details, then save.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Supplier &amp; Terms</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Supplier</label>
            <input className="form-input" value={form.supplier} onChange={(e) => updateField('supplier', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">TIN</label>
            <input className="form-input" value={form.tin} onChange={(e) => updateField('tin', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input className="form-input" value={form.contact_number} onChange={(e) => updateField('contact_number', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.po_date} onChange={(e) => updateField('po_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">PR No./s</label>
            <input className="form-input" placeholder="e.g. PR-2026-00011, PR-2026-00012" value={form.pr_numbers} onChange={(e) => updateField('pr_numbers', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mode of Procurement</label>
            <input className="form-input" value={form.mode_of_procurement} onChange={(e) => updateField('mode_of_procurement', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Term</label>
            <input className="form-input" value={form.payment_term} onChange={(e) => updateField('payment_term', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Delivery Term</label>
            <input className="form-input" value={form.delivery_term} onChange={(e) => updateField('delivery_term', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Delivery</label>
            <input type="date" className="form-input" value={form.date_of_delivery} onChange={(e) => updateField('date_of_delivery', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Municipal Mayor</label>
            <input className="form-input" value={form.mayor_name} onChange={(e) => updateField('mayor_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">BAC Secretary</label>
            <input className="form-input" value={form.bac_secretary_name} onChange={(e) => updateField('bac_secretary_name', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Items</h3>
          <button className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Stock/Property No.</th>
              <th>Unit</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No items added yet.</td></tr>
            ) : items.map((it, idx) => (
              <tr key={idx}>
                <td><input className="form-input" value={it.stock_property_no} onChange={(e) => updateItem(idx, 'stock_property_no', e.target.value)} style={{ width: 100 }} /></td>
                <td>
                  <select className="form-select" value={it.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} style={{ width: 100 }}>
                    <option value="">Select…</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td><input className="form-input" value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} /></td>
                <td><input className="form-input" type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} style={{ width: 80 }} /></td>
                <td><input className="form-input" type="number" min="0" step="0.01" value={it.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} style={{ width: 100 }} /></td>
                <td className="text-muted">₱{((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0)).toFixed(2)}</td>
                <td><button className="icon-btn danger" onClick={() => removeItem(idx)}>🗑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 0 && (
          <div style={{ padding: 14, textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border)' }}>
            Total: ₱{total.toFixed(2)}
          </div>
        )}
      </div>

      <div className="print-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/purchase-orders')}>Cancel</button>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Purchase Order'}</button>
      </div>
    </Layout>
  )
}
