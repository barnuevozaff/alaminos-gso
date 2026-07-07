import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import DepartmentAutocomplete from '../components/DepartmentAutocomplete'
import RisItemAutocomplete from '../components/RisItemAutocomplete'
import LOGO from '../assets/alaminos-seal.png'

export default function PublicRequisitionIssueSlipForm() {
  const navigate = useNavigate()
  const [requesterName, setRequesterName] = useState('')
  const [office, setOffice] = useState('')
  const [fund, setFund] = useState('')
  const [division, setDivision] = useState('')
  const [fppCode, setFppCode] = useState('')
  const [purpose, setPurpose] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addInventoryItem(invItem) {
    setItems((prev) => [...prev, {
      ris_inventory_id: invItem.id,
      stock_no: invItem.item_code,
      description: invItem.item_name,
      unit: invItem.unit,
      available: invItem.quantity,
      quantity: 1,
    }])
  }

  function updateQuantity(idx, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: value } : it))
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function validate() {
    if (!requesterName.trim()) return 'Requested by (name) is required.'
    if (!office) return 'Please select or enter an office.'
    if (items.length === 0) return 'Add at least one item from RIS inventory.'
    for (const it of items) {
      const qty = Number(it.quantity)
      if (!qty || qty <= 0) return `Enter a valid quantity for "${it.description}".`
      if (qty > it.available) return `Requested quantity for "${it.description}" exceeds available stock (${it.available}).`
    }
    return ''
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSubmitting(true)

    try {
      const { data: ris, error: risErr } = await supabase
        .from('requisition_issue_slips')
        .insert({
          office,
          requester_name: requesterName,
          fund: fund || null,
          division: division || null,
          fpp_code: fppCode || null,
          purpose: purpose || null,
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (risErr) throw risErr

      const itemRows = items.map((it, idx) => ({
        ris_id: ris.id,
        ris_inventory_id: it.ris_inventory_id,
        stock_no: it.stock_no,
        description: it.description,
        unit: it.unit,
        quantity: Number(it.quantity),
        sort_order: idx,
      }))
      const { error: itemsErr } = await supabase.from('ris_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      navigate(`/track-ris?ris=${encodeURIComponent(ris.ris_number)}&submitted=1`)
    } catch (e) {
      setError(e.message || 'Something went wrong while submitting your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="public-topbar">
        <div className="public-topbar-brand">
          <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div className="org-name" style={{ color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Municipality of Alaminos</div>
            <div className="gso-name" style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
            <div className="sys-name" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>
        <Link to="/track-ris" className="btn" style={{ flexShrink: 0, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ marginRight: 7 }} />Track a RIS
        </Link>
      </div>

      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="page-title">New Requisition and Issue Slip</h1>
        <p className="page-subtitle">The RIS number and date are generated automatically on submit.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Requester Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Requested by (Name) *</label>
              <input className="form-input" placeholder="Full name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Office *</label>
              <DepartmentAutocomplete value={office} onChange={setOffice} placeholder="Type or select an office…" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fund (optional)</label>
              <input className="form-input" value={fund} onChange={(e) => setFund(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Division (optional)</label>
              <input className="form-input" value={division} onChange={(e) => setDivision(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">FPP Code (optional)</label>
              <input className="form-input" value={fppCode} onChange={(e) => setFppCode(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose (optional)</label>
            <textarea className="form-textarea" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Items</h3>
          <RisItemAutocomplete
            onSelect={addInventoryItem}
            excludeIds={items.map((i) => i.ris_inventory_id)}
            placeholder="Search RIS inventory…"
          />

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr><th>Stock No.</th><th>Item</th><th>Unit</th><th>Available</th><th>Quantity</th><th></th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Search and add items above.</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="text-muted">{it.stock_no}</td>
                    <td><strong>{it.description}</strong></td>
                    <td>{it.unit}</td>
                    <td>{it.available}</td>
                    <td>
                      <input type="number" min="1" max={it.available} className="form-input" style={{ width: 90 }}
                        value={it.quantity} onChange={(e) => updateQuantity(idx, e.target.value)} />
                    </td>
                    <td><button className="icon-btn danger" onClick={() => removeItem(idx)}><FontAwesomeIcon icon={faTrash} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : '+ Submit Requisition'}
          </button>
        </div>
      </div>
    </div>
  )
}
