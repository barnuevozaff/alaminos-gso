import { fmt } from '../lib/fmt.js'
import { fmtDate } from '../lib/dateUtils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPrint } from '@fortawesome/free-solid-svg-icons'
import sealLogo from '../assets/alaminos-seal.png'

export default function RsmiPrintPreviewModal({ dateFrom, dateTo, fund, serialNumber, printDate, items, recap, grandTotal, onClose }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">Print Preview — Report of Supplies and Materials Issued</h3>
        <p className="text-muted" style={{ marginTop: -8, marginBottom: 16 }}>Signature blocks are left blank for manual completion on the printed copy.</p>

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div>Republic of the Philippines</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICIPALITY OF ALAMINOS</div>
            <div>Province of Laguna</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>GENERAL SERVICES OFFICE (GSO)</div>
            <div className="doc-title">REPORT OF SUPPLIES AND MATERIALS ISSUED</div>
            <div style={{ marginTop: 6 }}>For the Period {fmtDate(dateFrom)} to {fmtDate(dateTo)}</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>LGU:</strong> Municipality of Alaminos</div>
            <div><strong>Serial No.:</strong> {serialNumber}</div>
            <div><strong>Fund:</strong> {fund || ''}</div>
            <div><strong>Date:</strong> {fmtDate(printDate)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>RIS No.</th><th>Responsibility Center Code</th><th>Stock No.</th><th>Item</th><th>Unit</th><th>Quantity Issued</th><th>Unit Cost</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ height: 26 }}>
                  <td>{it.ris_number}</td>
                  <td></td>
                  <td>{it.stock_no}</td>
                  <td>{it.description}</td>
                  <td>{it.unit}</td>
                  <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(it.unit_cost)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(it.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ marginTop: 16, marginBottom: 6, fontWeight: 700 }}>Recapitulation:</p>
          <table>
            <thead>
              <tr>
                <th>Stock No.</th><th>Item</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th><th>Account Code</th>
              </tr>
            </thead>
            <tbody>
              {recap.map((r, idx) => (
                <tr key={idx} style={{ height: 26 }}>
                  <td>{r.stock_no}</td>
                  <td>{r.description}</td>
                  <td style={{ textAlign: 'right' }}>{r.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.unit_cost)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.total_cost)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 20, fontSize: 13 }}>I hereby certify to the correctness of the above information.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 40 }}>
            <div className="signature-blank">Signature over Printed Name of Supply and/or Property Custodian</div>
            <div className="signature-blank">Signature over Printed Name of Designated Accounting Staff</div>
            <div className="signature-blank">Date</div>
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
