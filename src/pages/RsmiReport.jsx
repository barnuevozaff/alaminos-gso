import { fmt } from '../lib/fmt.js'
import { useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import RsmiPrintPreviewModal from '../components/RsmiPrintPreviewModal'

function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RsmiReport() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [fund, setFund] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPrint, setShowPrint] = useState(false)
  const [preparingPrint, setPreparingPrint] = useState(false)
  const [serialNumber, setSerialNumber] = useState('')
  const [printDate, setPrintDate] = useState(null)

  useEffect(() => { load() }, [dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError('')
    let query = supabase
      .from('ris_items')
      .select('stock_no, description, unit, issued_quantity, requisition_issue_slips!inner(ris_number, decided_at, status), ris_inventory(unit_cost)')
      .eq('requisition_issue_slips.status', 'Approved')
      .not('issued_quantity', 'is', null)
      .order('decided_at', { foreignTable: 'requisition_issue_slips', ascending: true })

    if (dateFrom) query = query.gte('requisition_issue_slips.decided_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('requisition_issue_slips.decided_at', `${dateTo}T23:59:59`)

    const { data, error } = await query
    if (error) { setError(error.message); setLoading(false); return }
    setRows(data || [])
    setLoading(false)
  }

  const items = useMemo(() => rows.map((r) => {
    const unitCost = r.ris_inventory?.unit_cost ?? 0
    return {
      ris_number: r.requisition_issue_slips?.ris_number || '',
      stock_no: r.stock_no || '',
      description: r.description,
      unit: r.unit,
      quantity: r.issued_quantity,
      unit_cost: unitCost,
      amount: (r.issued_quantity || 0) * unitCost,
    }
  }), [rows])

  const recap = useMemo(() => {
    const byItem = new Map()
    for (const it of items) {
      const key = it.stock_no || it.description
      const existing = byItem.get(key)
      if (existing) {
        existing.quantity += it.quantity
        existing.total_cost += it.amount
      } else {
        byItem.set(key, { stock_no: it.stock_no, description: it.description, quantity: it.quantity, unit_cost: it.unit_cost, total_cost: it.amount })
      }
    }
    return [...byItem.values()]
  }, [items])

  const grandTotal = items.reduce((sum, it) => sum + it.amount, 0)

  async function handlePrintClick() {
    setPreparingPrint(true)
    setError('')
    const { data, error } = await supabase.rpc('next_rsmi_serial')
    setPreparingPrint(false)
    if (error) { setError(error.message); return }
    setSerialNumber(data)
    setPrintDate(new Date().toISOString())
    setShowPrint(true)
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Report of Supplies and Materials Issued</h1>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>Items deducted from RIS inventory for a given period (Appendix 40).</p>
        </div>
        <button className="btn btn-primary" disabled={loading || preparingPrint || items.length === 0} onClick={handlePrintClick}>
          <Printer size={16} style={{ marginRight: 6 }} />{preparingPrint ? 'Preparing…' : 'Print'}
        </button>
      </div>

      <div className="toolbar">
        <div className="form-group">
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading issued items…</div>
        ) : items.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No items issued</div>
            No approved RIS items were issued within the selected period.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RIS No.</th><th>Stock No.</th><th>Item</th><th>Unit</th><th>Qty Issued</th><th>Unit Cost</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.ris_number}</td>
                  <td className="text-muted">{it.stock_no}</td>
                  <td><strong>{it.description}</strong></td>
                  <td>{it.unit}</td>
                  <td>{it.quantity}</td>
                  <td>₱{fmt(it.unit_cost)}</td>
                  <td>₱{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                <td style={{ fontWeight: 700 }}>₱{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {!loading && recap.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: 20 }}>
          <div style={{ padding: '16px 22px 0' }}><h3 style={{ margin: 0 }}>Recapitulation</h3></div>
          <table className="data-table">
            <thead>
              <tr><th>Stock No.</th><th>Item</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th></tr>
            </thead>
            <tbody>
              {recap.map((r, idx) => (
                <tr key={idx}>
                  <td className="text-muted">{r.stock_no}</td>
                  <td><strong>{r.description}</strong></td>
                  <td>{r.quantity}</td>
                  <td>₱{fmt(r.unit_cost)}</td>
                  <td>₱{fmt(r.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPrint && (
        <RsmiPrintPreviewModal
          dateFrom={dateFrom}
          dateTo={dateTo}
          fund={fund}
          onFundChange={setFund}
          serialNumber={serialNumber}
          printDate={printDate}
          items={items}
          recap={recap}
          grandTotal={grandTotal}
          onClose={() => setShowPrint(false)}
        />
      )}
    </Layout>
  )
}
