import { fmt } from '../lib/fmt.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPrint } from '@fortawesome/free-solid-svg-icons'
import sealLogo from '../assets/alaminos-seal.png'

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function chunk(n) {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + chunk(n % 100) : '')
  }

  function intToWords(n) {
    if (n === 0) return 'Zero'
    let result = ''
    const billions = Math.floor(n / 1_000_000_000)
    const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
    const thousands = Math.floor((n % 1_000_000) / 1000)
    const rest = n % 1000
    if (billions) result += chunk(billions) + ' Billion '
    if (millions) result += chunk(millions) + ' Million '
    if (thousands) result += chunk(thousands) + ' Thousand '
    if (rest) result += chunk(rest)
    return result.trim()
  }

  const pesos = Math.floor(num)
  const centavos = Math.round((num - pesos) * 100)
  let words = intToWords(pesos) + ' Pesos'
  if (centavos > 0) words += ' and ' + intToWords(centavos) + ' Centavos'
  return words + ' Only'
}

export default function PrintPOModal({ po, items, prNumber, onClose }) {
  const total = items.reduce((sum, it) => sum + Number(it.amount ?? it.quantity * it.unit_cost), 0)
  const rows = [...items]
  while (rows.length < 8) rows.push(null)

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">Print Preview — {po.po_number}</h3>

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>PURCHASE ORDER</div>
            <div>Municipality of Alaminos, Laguna</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>Supplier:</strong> {po.supplier || ''}</div>
            <div><strong>P.O. No.:</strong> {po.po_number}</div>
            <div><strong>Address:</strong> {po.address}</div>
            <div><strong>Date:</strong> {new Date(po.po_date).toLocaleDateString()}</div>
            <div><strong>TIN:</strong> {po.tin || ''}</div>
            <div><strong>Mode of Procurement:</strong> {po.mode_of_procurement || ''}</div>
            <div><strong>Contact Number:</strong> {po.contact_number || ''}</div>
            <div><strong>PR No./s:</strong> {prNumber}</div>
          </div>

          <p>Gentlemen:</p>
          <p style={{ marginTop: -8 }}>Please furnish this Office the following articles subject to the terms and conditions contained herein:</p>

          <div className="print-meta-grid">
            <div><strong>Place of Delivery:</strong> {po.place_of_delivery}</div>
            <div><strong>Delivery Term:</strong> {po.delivery_term}</div>
            <div><strong>Date of Delivery:</strong> {po.date_of_delivery ? new Date(po.date_of_delivery).toLocaleDateString() : ''}</div>
            <div><strong>Payment Term:</strong> {po.payment_term}</div>
          </div>

          <table>
            <thead><tr><th>Stock/Property No.</th><th>Unit</th><th>Description</th><th>Quantity</th><th>Unit Cost</th><th>Amount</th></tr></thead>
            <tbody>
              {rows.map((it, idx) => (
                <tr key={idx} style={{ height: 24 }}>
                  <td>{it?.stock_property_no || ''}</td>
                  <td>{it?.unit || ''}</td>
                  <td>{it?.description || ''}</td>
                  <td style={{ textAlign: 'right' }}>{it?.quantity || ''}</td>
                  <td style={{ textAlign: 'right' }}>{it ? fmt(it.unit_cost) : ''}</td>
                  <td style={{ textAlign: 'right' }}>{it ? fmt(it.amount ?? it.quantity * it.unit_cost) : ''}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: 12 }}><em>({numberToWords(total)})</em></p>

          <p style={{ fontSize: 11.5, marginTop: 14 }}>
            In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10)
            of one percent for every day of delay shall be imposed on the undelivered item/s.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 26 }}>
            <div>
              <div>Conforme:</div>
              <div className="signature-line">Signature over Printed Name of Supplier</div>
              <div style={{ marginTop: 18, borderTop: '1px solid #000', paddingTop: 4, fontSize: 12, textAlign: 'center' }}>Date</div>
            </div>
            <div>
              <div>Very truly yours,</div>
              <div className="signature-line">{po.mayor_name}<br /><span className="text-muted">Municipal Mayor</span></div>
            </div>
          </div>

          <p style={{ fontSize: 11, marginTop: 22 }}>
            (In case of Negotiated Purchase pursuant to Section 369 (a) of RA 7160, this portion must be accomplished.)<br />
            Approved per Sanggunian BAC Resolution No. {po.bac_resolution_no || ''} Series of {po.bac_series_year}
          </p>

          <div style={{ marginTop: 14 }}>
            <div>Certified Correct:</div>
            <div className="signature-line" style={{ display: 'inline-block', minWidth: 240 }}>{po.bac_secretary_name}<br /><span className="text-muted">BAC Secretary</span></div>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
