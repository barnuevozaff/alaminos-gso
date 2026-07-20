import { X, Printer } from 'lucide-react'
import sealLogo from '../assets/alaminos-seal.png'
import { fmt } from '../lib/fmt'
import { MONTH_NAMES } from '../lib/energyUtils'

export default function EnergyReportPrintModal({ mode, periodLabel, rows, summary, onClose }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        <h3 className="modal-title">Print Preview — Energy Consumption Report</h3>
        <p className="text-muted" style={{ marginTop: -8, marginBottom: 16 }}>Signature blocks are left blank for manual completion on the printed copy.</p>

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div>Republic of the Philippines</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICIPALITY OF ALAMINOS</div>
            <div>Province of Laguna</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>GENERAL SERVICES OFFICE (GSO)</div>
            <div className="doc-title">ENERGY CONSUMPTION REPORT</div>
            <div style={{ marginTop: 6 }}>{mode === 'comparison' ? `For ${periodLabel}` : `For the Period ${periodLabel}`}</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>LGU:</strong> Municipality of Alaminos</div>
            <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>

          {mode === 'comparison' ? (
            <table>
              <thead>
                <tr>
                  <th>Account Number</th><th>Location</th><th>Meter Number</th><th>Current Bill</th><th>Previous Bill</th><th>Difference</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ height: 26 }}>
                    <td>{r.account_number}</td>
                    <td>{r.location}</td>
                    <td>{r.meter_number}</td>
                    <td style={{ textAlign: 'right' }}>{r.current != null ? fmt(r.current) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.previous != null ? fmt(r.previous) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.diff != null ? `${r.diff >= 0 ? '+' : ''}${fmt(r.diff)}` : '—'}</td>
                    <td>{r.status === 'increase' ? 'Increased' : r.status === 'decrease' ? 'Decreased' : 'No Change'}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(summary.grandTotal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Account Number</th><th>Location</th><th>Meter Number</th><th>Billing Period</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ height: 26 }}>
                    <td>{r.account_number}</td>
                    <td>{r.location}</td>
                    <td>{r.meter_number}</td>
                    <td>{MONTH_NAMES[r.billing_month - 1]} {r.billing_year}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(summary.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {mode === 'comparison' && (
            <p style={{ marginTop: 14, fontSize: 13 }}>
              Total Accounts: {rows.length} &nbsp;·&nbsp; Total Increased: {summary.increased} &nbsp;·&nbsp; Total Decreased: {summary.decreased}
              {summary.overall.status !== 'none' && (
                <> &nbsp;·&nbsp; Overall {summary.overall.status === 'increase' ? 'Increased' : 'Decreased'} by ₱{fmt(Math.abs(summary.overall.diff))} ({Math.abs(summary.overall.pct).toFixed(1)}%)</>
              )}
            </p>
          )}

          <p style={{ marginTop: 20, fontSize: 13 }}>I hereby certify to the correctness of the above information.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40 }}>
            <div className="signature-blank">Prepared By</div>
            <div className="signature-blank">Approved By</div>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}><Printer size={16} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
