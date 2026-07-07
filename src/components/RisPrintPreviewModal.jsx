import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPrint } from '@fortawesome/free-solid-svg-icons'
import sealLogo from '../assets/alaminos-seal.png'

export default function RisPrintPreviewModal({ ris, items, onClose }) {
  const [approvedBy, setApprovedBy] = useState('FLORENTINO J. DESTACAMENTO')
  const [issuedBy, setIssuedBy] = useState('FLORENTINO J. DESTACAMENTO')
  const [receivedBy, setReceivedBy] = useState('')

  const rows = [...items]
  while (rows.length < 12) rows.push(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">Print Preview — {ris.ris_number}</h3>

        <div className="form-row" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Approved by</label>
            <input className="form-input" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Issued by</label>
            <input className="form-input" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Received by</label>
            <input className="form-input" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
          </div>
        </div>

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div>Republic of the Philippines</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICIPALITY OF ALAMINOS</div>
            <div>Province of Laguna</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>GENERAL SERVICES OFFICE (GSO)</div>
            <div className="doc-title">REQUISITION AND ISSUE SLIP</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>LGU:</strong> Municipality of Alaminos</div>
            <div><strong>Fund:</strong> {ris.fund || '—'}</div>
            <div><strong>Division:</strong> {ris.division || '—'}</div>
            <div><strong>FPP Code:</strong> {ris.fpp_code || '—'}</div>
            <div><strong>Office:</strong> {ris.office}</div>
            <div><strong>RIS No.:</strong> {ris.ris_number}</div>
            <div></div>
            <div><strong>Date:</strong> {new Date(ris.ris_date).toLocaleDateString()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th colSpan={4} style={{ textAlign: 'center' }}>Requisition</th>
                <th colSpan={2} style={{ textAlign: 'center' }}>Issuance</th>
              </tr>
              <tr>
                <th>Stock No.</th><th>Unit</th><th>Description</th><th>Quantity</th><th>Quantity</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it, idx) => (
                <tr key={idx} style={{ height: 26 }}>
                  <td>{it?.stock_no || ''}</td>
                  <td>{it?.unit || ''}</td>
                  <td>{it?.description || ''}</td>
                  <td style={{ textAlign: 'right' }}>{it?.quantity ?? ''}</td>
                  <td style={{ textAlign: 'right' }}>{it?.issued_quantity ?? ''}</td>
                  <td>{it?.remarks || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 14, fontSize: 13 }}><strong>Purpose:</strong> {ris.purpose || '—'}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginTop: 30 }}>
            <div className="signature-line">{ris.requester_name}<br /><span className="text-muted">Requested by</span></div>
            <div className="signature-line">{approvedBy}<br /><span className="text-muted">Approved by</span></div>
            <div className="signature-line">{issuedBy}<br /><span className="text-muted">Issued by</span></div>
            <div className="signature-line">{receivedBy}<br /><span className="text-muted">Received by</span></div>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}><FontAwesomeIcon icon={faPrint} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
