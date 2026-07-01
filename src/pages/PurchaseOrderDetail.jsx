import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import PrintPOModal from '../components/PrintPOModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [pr, setPr] = useState(null)
  const [existingAir, setExistingAir] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [confirmIssue, setConfirmIssue] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: poData, error: poErr } = await supabase.from('purchase_orders').select('*').eq('id', id).single()
    const { data: itemsData } = await supabase.from('po_items_live').select('*').eq('po_id', id).order('sort_order')
    if (poErr) { setError(poErr.message); setLoading(false); return }
    setPo(poData)
    setItems(itemsData || [])

    if (poData.pr_id) {
      const { data: prData } = await supabase.from('purchase_requests').select('*').eq('id', poData.pr_id).single()
      setPr(prData)
    }
    const { data: air } = await supabase.from('acceptance_inspection_reports').select('id').eq('po_id', id).maybeSingle()
    setExistingAir(air)
    setLoading(false)
  }

  function updateField(field, value) {
    setPo((prev) => ({ ...prev, [field]: value }))
  }

  function updateQuantity(idx, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: value } : it))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: updErr } = await supabase.from('purchase_orders').update({
      supplier: po.supplier, address: po.address, tin: po.tin, contact_number: po.contact_number,
      mode_of_procurement: po.mode_of_procurement, delivery_term: po.delivery_term,
      date_of_delivery: po.date_of_delivery || null, payment_term: po.payment_term,
      pr_numbers: po.pr_numbers, mayor_name: po.mayor_name || null, bac_secretary_name: po.bac_secretary_name || null,
    }).eq('id', id)

    if (updErr) { setError(updErr.message); setSaving(false); return }

    await supabase.from('po_items').delete().eq('po_id', id)
    const rows = items.map((it, idx) => ({
      po_id: id, stock_property_no: it.stock_property_no, unit: it.unit, description: it.description,
      quantity: Number(it.quantity), unit_cost: it.unit_cost, sort_order: idx,
    }))
    if (rows.length) await supabase.from('po_items').insert(rows)

    setSaving(false)
    load()
  }

  async function handleIssue() {
    setSaving(true)
    const { error } = await supabase.from('purchase_orders').update({ status: 'Issued' }).eq('id', id)
    if (!error) {
      await supabase.from('audit_logs').insert({ action: 'PO_ISSUED', description: `Issued ${po.po_number}`, performed_by: profile?.id })
    }
    setSaving(false)
    setConfirmIssue(false)
    load()
  }

  async function handleGenerateAIR() {
    if (existingAir) { navigate(`/admin/air/${existingAir.id}`); return }
    setSaving(true)
    const { data: newAir, error } = await supabase.from('acceptance_inspection_reports').insert({
      po_id: id,
      requisitioning_office: pr?.department || null,
      created_by: profile?.id,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    await supabase.from('audit_logs').insert({ action: 'AIR_GENERATED', description: `Generated ${newAir.air_number} for ${po.po_number}`, performed_by: profile?.id })
    navigate(`/admin/air/${newAir.id}`)
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading purchase order…</div></Layout>
  if (!po) return <Layout><div className="state-box">{error || 'Purchase order not found.'}</div></Layout>

  const isLocked = po.status !== 'Draft'
  const total = items.reduce((sum, it) => sum + Number(it.amount ?? it.quantity * it.unit_cost), 0)

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div>
          <button style={{ background: 'none', border: 'none', padding: 0, marginBottom: 8, cursor: 'pointer', color: 'var(--text)' }} onClick={() => navigate('/admin/purchase-orders')}><FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{po.po_number}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            {po.pr_numbers || pr?.pr_number ? `PR No./s: ${po.pr_numbers || pr.pr_number}` : 'No PR No./s on file'}
          </p>
        </div>
        <div className="gap-8">
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)}><FontAwesomeIcon icon={faPrint} style={{ marginRight: 6 }} />Print</button>
          {po.status === 'Draft' && (
            <button className="btn btn-success" disabled={saving} onClick={() => setConfirmIssue(true)}>Issue PO</button>
          )}
          {po.status === 'Issued' && (
            <button className="btn btn-primary" disabled={saving} onClick={handleGenerateAIR}>
              {existingAir ? 'View AIR' : 'Generate AIR'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Supplier &amp; Terms</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Supplier</label>
            <input className="form-input" disabled={isLocked} value={po.supplier || ''} onChange={(e) => updateField('supplier', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">TIN</label>
            <input className="form-input" disabled={isLocked} value={po.tin || ''} onChange={(e) => updateField('tin', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" disabled={isLocked} value={po.address || ''} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input className="form-input" disabled={isLocked} value={po.contact_number || ''} onChange={(e) => updateField('contact_number', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mode of Procurement</label>
            <input className="form-input" disabled={isLocked} value={po.mode_of_procurement || ''} onChange={(e) => updateField('mode_of_procurement', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Term</label>
            <input className="form-input" disabled={isLocked} value={po.payment_term || ''} onChange={(e) => updateField('payment_term', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">PR No./s</label>
            <input className="form-input" disabled={isLocked} placeholder="e.g. PR-2026-00011, PR-2026-00012" value={po.pr_numbers || ''} onChange={(e) => updateField('pr_numbers', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Term</label>
            <input className="form-input" disabled={isLocked} value={po.delivery_term || ''} onChange={(e) => updateField('delivery_term', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date of Delivery</label>
            <input type="date" className="form-input" disabled={isLocked} value={po.date_of_delivery || ''} onChange={(e) => updateField('date_of_delivery', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Municipal Mayor</label>
            <input className="form-input" disabled={isLocked} value={po.mayor_name || ''} onChange={(e) => updateField('mayor_name', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">BAC Secretary</label>
          <input className="form-input" disabled={isLocked} value={po.bac_secretary_name || ''} onChange={(e) => updateField('bac_secretary_name', e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
        <div style={{ padding: '16px 22px 0' }}><h3 style={{ margin: 0 }}>Items</h3></div>
        <table className="data-table line-items-table">
          <thead><tr><th>Stock/Property No.</th><th>Unit</th><th>Description</th><th>Quantity</th><th>Unit Cost</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td className="text-muted">{it.stock_property_no || '—'}</td>
                <td className="text-muted">{it.unit}</td>
                <td><strong>{it.description}</strong></td>
                <td>
                  {isLocked ? it.quantity : (
                    <input type="number" min="1" value={it.quantity} onChange={(e) => updateQuantity(idx, e.target.value)} style={{ width: 80 }} />
                  )}
                </td>
                <td className="text-muted">₱{Number(it.unit_cost).toFixed(2)}</td>
                <td className="text-muted">₱{(Number(it.quantity) * Number(it.unit_cost)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 14, textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border)' }}>Total: ₱{total.toFixed(2)}</div>
      </div>
      {items.length > 0 && !isLocked && (
        <p className="form-hint" style={{ marginTop: -8, marginBottom: 16 }}>Pricing, description, and unit come from Inventory and cannot be edited here.</p>
      )}

      {!isLocked && (
        <div className="print-actions">
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      )}

      {showPrint && <PrintPOModal po={po} items={items} prNumber={po.pr_numbers || pr?.pr_number} onClose={() => setShowPrint(false)} />}

      {confirmIssue && (
        <ConfirmDialog
          title="Issue this Purchase Order?"
          message="Once issued, supplier and item details can no longer be edited. You'll be able to generate the Acceptance and Inspection Report afterward."
          confirmLabel="Issue PO"
          confirmClass="btn-success"
          busy={saving}
          onConfirm={handleIssue}
          onCancel={() => setConfirmIssue(false)}
        />
      )}
    </Layout>
  )
}
