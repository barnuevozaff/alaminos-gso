import { useState } from 'react'

export default function PrintPreviewModal({ pr, items, onClose }) {
  const [gso, setGso] = useState('FLORENTINO J. DESTACAMENTO')
  const [treasurer, setTreasurer] = useState('ROWENA C. LANDICHO')
  const [mayor, setMayor] = useState('Hon. ERICSON R. LOPEZ')

  const grandTotal = items.reduce((sum, it) => sum + Number(it.total_cost ?? it.quantity * it.unit_cost), 0)
  const rows = [...items]
  while (rows.length < 10) rows.push(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3 className="modal-title">Print Preview — {pr.pr_number}</h3>

        <div className="form-row" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">General Services Officer</label>
            <input className="form-input" value={gso} onChange={(e) => setGso(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Municipal Treasurer</label>
            <input className="form-input" value={treasurer} onChange={(e) => setTreasurer(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Municipal Mayor</label>
            <input className="form-input" value={mayor} onChange={(e) => setMayor(e.target.value)} />
          </div>
        </div>

        <div className="print-sheet">
          <div className="print-header-center">
            <div>Republic of the Philippines</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICIPALITY OF ALAMINOS</div>
            <div>Province of Laguna</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>GENERAL SERVICES OFFICE (GSO)</div>
            <div className="doc-title">PURCHASE REQUEST</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>LGU:</strong> Municipality of Alaminos</div>
            <div><strong>Fund:</strong> {pr.fund || 'General Fund'}</div>
            <div><strong>Department:</strong> {pr.department}</div>
            <div><strong>PR No.:</strong> {pr.pr_number}</div>
            <div><strong>Section:</strong> ____________________</div>
            <div><strong>Date:</strong> {new Date(pr.pr_date).toLocaleDateString()}</div>
            <div><strong>Requester:</strong> {pr.requester_name}</div>
            <div><strong>FPP:</strong> ____________________</div>
          </div>

          <table>
            <thead>
              <tr><th>Item No.</th><th>Unit</th><th>Item Description</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th></tr>
            </thead>
            <tbody>
              {rows.map((it, idx) => (
                <tr key={idx} style={{ height: 26 }}>
                  <td>{it ? idx + 1 : ''}</td>
                  <td>{it?.unit || ''}</td>
                  <td>{it?.item_description || ''}</td>
                  <td style={{ textAlign: 'right' }}>{it?.quantity || ''}</td>
                  <td style={{ textAlign: 'right' }}>{it ? Number(it.unit_cost).toFixed(2) : ''}</td>
                  <td style={{ textAlign: 'right' }}>{it ? Number(it.total_cost ?? it.quantity * it.unit_cost).toFixed(2) : ''}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>GRAND TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 10 }}><strong>Purpose:</strong> {pr.purpose || '—'}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 30 }}>
            <div className="signature-line">{gso}<br /><span className="text-muted">General Services Officer</span></div>
            <div className="signature-line">{treasurer}<br /><span className="text-muted">Municipal Treasurer</span></div>
            <div className="signature-line">{mayor}<br /><span className="text-muted">Municipal Mayor</span></div>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖶 Print</button>
        </div>
      </div>
    </div>
  )
}
