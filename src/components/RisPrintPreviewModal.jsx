import { X, Printer } from 'lucide-react'
import sealLogo from '../assets/alaminos-seal.png'

export default function RisPrintPreviewModal({ ris, items, onClose }) {
  const rows = [...items]
  while (rows.length < 12) rows.push(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        <h3 className="modal-title">Print Preview — {ris.ris_number}</h3>
        <p className="text-muted" style={{ marginTop: -8, marginBottom: 16 }}>Signatures are left blank for physical signing on the printed copy.</p>

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
            <div><strong>Fund:</strong> {ris.fund || ''}</div>
            <div><strong>Division:</strong> {ris.division || ''}</div>
            <div><strong>FPP Code:</strong> {ris.fpp_code || ''}</div>
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

          <p style={{ marginTop: 14, fontSize: 13 }}><strong>Purpose:</strong> {ris.purpose || ''}</p>

          <table style={{ marginTop: 24 }}>
            <thead>
              <tr>
                <th></th>
                <th>Requested by:</th>
                <th>Approved by:</th>
                <th>Issued by:</th>
                <th>Received by:</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: 34 }}>
                <td><strong>Signature :</strong></td>
                <td></td><td></td><td></td><td></td>
              </tr>
              <tr style={{ height: 30 }}>
                <td><strong>Printed Name :</strong></td>
                <td></td><td></td><td></td><td></td>
              </tr>
              <tr style={{ height: 30 }}>
                <td><strong>Designation :</strong></td>
                <td></td><td></td><td></td><td></td>
              </tr>
              <tr style={{ height: 30 }}>
                <td><strong>Date :</strong></td>
                <td></td><td></td><td></td><td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}><Printer size={16} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
