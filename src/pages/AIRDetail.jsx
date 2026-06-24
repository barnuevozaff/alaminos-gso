import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import PrintAIRModal from '../components/PrintAIRModal'

export default function AIRDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [air, setAir] = useState(null)
  const [po, setPo] = useState(null)
  const [poItems, setPoItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: airData, error: airErr } = await supabase.from('acceptance_inspection_reports').select('*').eq('id', id).single()
    if (airErr) { setError(airErr.message); setLoading(false); return }
    setAir(airData)

    if (airData.po_id) {
      const { data: poData } = await supabase.from('purchase_orders').select('*').eq('id', airData.po_id).single()
      const { data: items } = await supabase.from('po_items').select('*').eq('po_id', airData.po_id).order('sort_order')
      setPo(poData)
      setPoItems(items || [])
    }
    setLoading(false)
  }

  function updateField(field, value) {
    setAir((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error } = await supabase.from('acceptance_inspection_reports').update({
      requisitioning_office: air.requisitioning_office,
      invoice_no: air.invoice_no,
      invoice_date: air.invoice_date || null,
      acceptance_type: air.acceptance_type,
      partial_notes: air.partial_notes,
    }).eq('id', id)
    setSaving(false)
    if (error) { setError(error.message); return }
    load()
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading AIR…</div></Layout>
  if (!air) return <Layout><div className="state-box">{error || 'Report not found.'}</div></Layout>

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div>
          <button style={{ background: 'none', border: 'none', padding: 0, marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(`/admin/purchase-orders/${air.po_id}`)}>← Back to PO</button>
          <h1 className="page-title" style={{ margin: 0 }}>{air.air_number}</h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>Acceptance and Inspection Report{po ? ` for ${po.po_number}` : ''}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowPrint(true)}>🖶 Print</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Report Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Requisitioning Office/Dept.</label>
            <input className="form-input" value={air.requisitioning_office || ''} onChange={(e) => updateField('requisitioning_office', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Invoice No.</label>
            <input className="form-input" value={air.invoice_no || ''} onChange={(e) => updateField('invoice_no', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Invoice Date</label>
          <input type="date" className="form-input" value={air.invoice_date || ''} onChange={(e) => updateField('invoice_date', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Acceptance</label>
          <div className="gap-8">
            <label><input type="radio" checked={air.acceptance_type === 'Complete'} onChange={() => updateField('acceptance_type', 'Complete')} /> Complete</label>
            <label><input type="radio" checked={air.acceptance_type === 'Partial'} onChange={() => updateField('acceptance_type', 'Partial')} /> Partial</label>
          </div>
          {air.acceptance_type === 'Partial' && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Please specify"
              value={air.partial_notes || ''} onChange={(e) => updateField('partial_notes', e.target.value)} />
          )}
        </div>

        <div className="print-actions">
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '16px 22px 0' }}><h3 style={{ margin: 0 }}>Items (from linked Purchase Order)</h3></div>
        <table className="data-table">
          <thead><tr><th>Stock/Property No.</th><th>Description</th><th>Unit</th><th>Quantity</th></tr></thead>
          <tbody>
            {poItems.map((it) => (
              <tr key={it.id}>
                <td>{it.stock_property_no || '—'}</td>
                <td>{it.description}</td>
                <td>{it.unit}</td>
                <td>{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPrint && <PrintAIRModal air={air} po={po} items={poItems} onClose={() => setShowPrint(false)} />}
    </Layout>
  )
}
