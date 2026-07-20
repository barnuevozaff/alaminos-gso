import { X, Printer } from 'lucide-react'
import sealLogo from '../assets/alaminos-seal.png'
import { fmt } from '../lib/fmt'
import { MONTH_NAMES } from '../lib/energyUtils'

export default function EnergyReportPrintModal({ mode, periodLabel, rows, summary, threeMonthTrend, trendComparison, onClose }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay">
      {/* Scoped to this modal only (removed on unmount) so other reports'
          print output — RSMI, PR, RIS — stays portrait as before. Explicit
          "11in 8.5in" instead of the bare "landscape" keyword — testing
          showed Chrome's print dialog can silently ignore the keyword form
          and fall back to portrait, but honors explicit swapped dimensions. */}
      <style>{'@page { size: 11in 8.5in; margin: 14mm; }'}</style>
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        <h3 className="modal-title">Print Preview — Energy Consumption Report</h3>
        <p className="text-muted" style={{ marginTop: -8, marginBottom: 16 }}>Signature blocks are left blank for manual completion on the printed copy.</p>

        <div className="print-sheet" style={{ maxWidth: 920 }}>
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
            <>
              <p style={{ fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Monthly Electricity Consumption</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', width: '100%', maxWidth: 720 }}>
                  <table style={{ flex: '0 0 auto' }}>
                    <thead>
                      <tr>
                        <th></th>
                        {threeMonthTrend.map((p) => <th key={`${p.year}-${p.month}`}>{p.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: 26 }}>
                        <td>Total Amount (Php)</td>
                        {threeMonthTrend.map((p) => <td key={`${p.year}-${p.month}`} style={{ textAlign: 'right' }}>{fmt(p.total)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #444', padding: '10px 20px', fontSize: 16, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
                    {trendComparison.status !== 'none'
                      ? `${trendComparison.status === 'increase' ? 'Increased' : 'Decreased'} by ${Math.abs(trendComparison.pct).toFixed(2)}% compared to previous month`
                      : 'No prior month data available for comparison'}
                  </div>
                </div>
              </div>
            </>
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
