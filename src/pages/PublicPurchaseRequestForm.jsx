import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DepartmentAutocomplete from '../components/DepartmentAutocomplete'
import ItemAutocomplete from '../components/ItemAutocomplete'
import LOGO from '../assets/alaminos-seal.jpeg'

export default function PublicPurchaseRequestForm() {
  const navigate = useNavigate()
  const [requesterName, setRequesterName] = useState('')
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addInventoryItem(invItem) {
    setItems((prev) => [...prev, {
      inventory_id: invItem.id,
      item_code: invItem.item_code,
      item_description: invItem.item_name,
      unit: invItem.unit,
      available: invItem.quantity,
      quantity: 1,
      unit_cost: invItem.unit_cost,
    }])
  }

  function updateQuantity(idx, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: value } : it))
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function validate() {
    if (!requesterName.trim()) return 'Requester name is required.'
    if (!department) return 'Please select or enter a department.'
    if (items.length === 0) return 'Add at least one item from inventory.'
    for (const it of items) {
      const qty = Number(it.quantity)
      if (!qty || qty <= 0) return `Enter a valid quantity for "${it.item_description}".`
      if (qty > it.available) return `Requested quantity for "${it.item_description}" exceeds available stock (${it.available}).`
    }
    return ''
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSubmitting(true)

    try {
      const { data: pr, error: prErr } = await supabase
        .from('purchase_requests')
        .insert({
          department,
          requester_name: requesterName,
          purpose: purpose || null,
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (prErr) throw prErr

      const itemRows = items.map((it, idx) => ({
        pr_id: pr.id,
        inventory_id: it.inventory_id,
        item_code: it.item_code,
        item_description: it.item_description,
        unit: it.unit,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost) || 0,
        sort_order: idx,
      }))
      const { error: itemsErr } = await supabase.from('pr_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      navigate(`/track-request?pr=${encodeURIComponent(pr.pr_number)}&submitted=1`)
    } catch (e) {
      setError(e.message || 'Something went wrong while submitting your request.')
    } finally {
      setSubmitting(false)
    }
  }

  const grandTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Municipality of Alaminos</div>
            <div style={{ fontWeight: 700 }}>General Services Office (GSO)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>
        <div className="gap-8">
          <Link to="/track-request" className="btn btn-secondary">Track a Request</Link>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="page-title">New Purchase Request</h1>
        <p className="page-subtitle">The PR number and date are generated automatically on submit.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Requester Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Requester Name *</label>
              <input className="form-input" placeholder="Full name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Department / Office *</label>
              <DepartmentAutocomplete value={department} onChange={setDepartment} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose / Remarks (optional)</label>
            <textarea className="form-textarea" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Items</h3>
          <ItemAutocomplete
            onSelect={addInventoryItem}
            excludeIds={items.map((i) => i.inventory_id)}
            placeholder="Search inventory…"
          />

          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Item</th><th>Unit</th><th>Available</th><th>Quantity</th><th>Unit Cost</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Search and add items above.</td></tr>
              ) : items.map((it, idx) => (
                <tr key={idx}>
                  <td><strong>{it.item_description}</strong></td>
                  <td>{it.unit}</td>
                  <td>{it.available}</td>
                  <td>
                    <input type="number" min="1" max={it.available} className="form-input" style={{ width: 90 }}
                      value={it.quantity} onChange={(e) => updateQuantity(idx, e.target.value)} />
                  </td>
                  <td className="text-muted">₱{Number(it.unit_cost).toFixed(2)}</td>
                  <td className="text-muted">₱{((Number(it.quantity) || 0) * Number(it.unit_cost)).toFixed(2)}</td>
                  <td><button className="icon-btn danger" onClick={() => removeItem(idx)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="form-hint" style={{ marginTop: 8 }}>Pricing is set by the GSO Inventory and cannot be edited here.</p>
          {items.length > 0 && (
            <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 10 }}>Grand Total: ₱{grandTotal.toFixed(2)}</div>
          )}
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : '+ Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
