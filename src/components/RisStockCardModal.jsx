import { fmtDate } from '../lib/dateUtils'
import { useEffect, useMemo, useState } from 'react'
import { X, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import sealLogo from '../assets/alaminos-seal.png'

export default function RisStockCardModal({ item, onClose }) {
  const [lgu, setLgu] = useState('')
  const [fund, setFund] = useState('')
  const [movements, setMovements] = useState([])
  const [officeByRef, setOfficeByRef] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError('')
    const { data: moves, error } = await supabase
      .from('ris_stock_movements')
      .select('*')
      .eq('ris_inventory_id', item.id)
      .order('created_at', { ascending: true })
    if (error) { setError(error.message); setLoading(false); return }

    const refs = [...new Set(
      (moves || []).filter((m) => m.movement_type === 'Out' && m.reference).map((m) => m.reference)
    )]
    let map = {}
    if (refs.length > 0) {
      const { data: slips } = await supabase
        .from('requisition_issue_slips')
        .select('ris_number, office')
        .in('ris_number', refs)
      map = Object.fromEntries((slips || []).map((s) => [s.ris_number, s.office]))
    }

    setMovements(moves || [])
    setOfficeByRef(map)
    setLoading(false)
  }

  const rows = useMemo(() => {
    let balance = 0
    return movements.map((m) => {
      balance += m.movement_type === 'In' ? Number(m.quantity) : -Number(m.quantity)
      return {
        date: m.created_at,
        reference: m.reference || '',
        receiptQty: m.movement_type === 'In' ? m.quantity : null,
        issueQty: m.movement_type === 'Out' ? m.quantity : null,
        office: m.movement_type === 'Out' ? (officeByRef[m.reference] || '') : '',
        balance,
      }
    })
  }, [movements, officeByRef])

  const paddedRows = [...rows]
  while (paddedRows.length < 30) paddedRows.push(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 900 }}>
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        <h3 className="modal-title">Stock Card — {item.item_name}</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">LGU (optional)</label>
            <input className="form-input" placeholder="e.g. Municipality of Alaminos" value={lgu} onChange={(e) => setLgu(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fund (optional)</label>
            <input className="form-input" placeholder="e.g. General Fund" value={fund} onChange={(e) => setFund(e.target.value)} />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div>Republic of the Philippines</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICIPALITY OF ALAMINOS</div>
            <div>Province of Laguna</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>GENERAL SERVICES OFFICE (GSO)</div>
            <div className="doc-title">STOCK CARD</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>LGU:</strong> {lgu}</div>
            <div><strong>Fund:</strong> {fund}</div>
            <div><strong>Item:</strong> {item.item_name}</div>
            <div><strong>Stock No.:</strong> {item.item_code}</div>
            <div><strong>Description:</strong> {item.item_name}</div>
            <div><strong>Re-order Point:</strong> {item.reorder_level ?? 10}</div>
            <div><strong>Unit of Measurement:</strong> {item.unit}</div>
            <div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th><th>Reference</th><th>Receipt Qty</th><th>Issue Qty</th><th>Office</th><th>Balance Qty</th><th>No. of Days to Consume</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading…</td></tr>
              ) : (
                paddedRows.map((r, idx) => (
                  <tr key={idx} style={{ height: 26 }}>
                    <td>{r ? fmtDate(r.date) : ''}</td>
                    <td>{r?.reference || ''}</td>
                    <td style={{ textAlign: 'right' }}>{r?.receiptQty ?? ''}</td>
                    <td style={{ textAlign: 'right' }}>{r?.issueQty ?? ''}</td>
                    <td>{r?.office || ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{r?.balance ?? ''}</td>
                    <td></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p style={{ marginTop: 14, fontSize: 12, fontStyle: 'italic' }}>For Property Office Use</p>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}><Printer size={16} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
