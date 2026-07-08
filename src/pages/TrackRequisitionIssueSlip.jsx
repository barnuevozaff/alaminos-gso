import { fmtDate } from '../lib/dateUtils'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Home, Eye, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateRequisitionIssueSlipPDF } from '../lib/generateRisPdf'
import StatusBadge from '../components/StatusBadge'
import RisPrintPreviewModal from '../components/RisPrintPreviewModal'
import LOGO from '../assets/alaminos-seal.png'

export default function TrackRequisitionIssueSlip() {
  const [params] = useSearchParams()
  const [risNumber, setRisNumber] = useState(params.get('ris') || '')
  const [result, setResult] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const justSubmitted = params.get('submitted') === '1'

  useEffect(() => {
    if (params.get('ris')) handleTrack(params.get('ris'))
  }, [])

  async function handleTrack(overrideNumber) {
    const value = (overrideNumber || risNumber).trim()
    if (!value) return
    setLoading(true)
    setError('')
    setResult(null)
    const { data, error } = await supabase
      .from('requisition_issue_slips')
      .select('*')
      .eq('ris_number', value)
      .maybeSingle()

    if (error) { setError(error.message); setLoading(false); return }
    if (!data) { setError(`No request found with RIS number "${value}".`); setLoading(false); return }

    const { data: itemsData } = await supabase.from('ris_items').select('*').eq('ris_id', data.id).order('sort_order')
    setResult(data)
    setItems(itemsData || [])
    setLoading(false)
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    await generateRequisitionIssueSlipPDF(result, items)
    setDownloadingPdf(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="public-topbar">
        <div className="public-topbar-brand">
          <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div className="org-name" style={{ color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Municipality of Alaminos</div>
            <div className="gso-name" style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
            <div className="sys-name" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>
        <Link to="/" className="btn" style={{ flexShrink: 0, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
          <Home size={16} style={{ marginRight: 7 }} />Home
        </Link>
      </div>

      <div className="page-content" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Track a Requisition and Issue Slip</h3>

          {justSubmitted && (
            <div className="alert alert-success">Your request was submitted successfully. Save your RIS number below to check its status anytime.</div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: 0 }}
              placeholder="e.g. RIS-2026-00001"
              value={risNumber}
              onChange={(e) => setRisNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            />
            <button className="btn btn-primary" onClick={() => handleTrack()} disabled={loading}>
              {loading ? <><Loader2 size={16} className="icon-spin" style={{ marginRight: 6 }} />Searching…</> : <><Search size={16} style={{ marginRight: 6 }} />Track</>}
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}
        </div>

        {result && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="flex-between">
              <h3 style={{ margin: 0 }}>{result.ris_number}</h3>
              <div className="gap-8">
                <StatusBadge status={result.status} />
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrint(true)}>
                  <Eye size={16} style={{ marginRight: 6 }} />View / Print
                </button>
                <button className="btn btn-secondary btn-sm" disabled={downloadingPdf} onClick={handleDownloadPdf}>
                  {downloadingPdf ? 'Generating…' : '⬇ PDF'}
                </button>
              </div>
            </div>
            <div className="print-meta-grid" style={{ marginTop: 14 }}>
              <div><strong>Requested by:</strong> {result.requester_name}</div>
              <div><strong>Office:</strong> {result.office}</div>
              <div><strong>Date:</strong> {fmtDate(result.ris_date)}</div>
              <div><strong>Status:</strong> {result.status}</div>
            </div>
            {result.status === 'Rejected' && result.rejection_reason && (
              <div className="alert alert-error" style={{ marginTop: 10 }}><strong>Reason:</strong> {result.rejection_reason}</div>
            )}

            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table className="data-table">
                <thead><tr><th>Stock No.</th><th>Item</th><th>Unit</th><th>Requested Qty</th><th>Issued Qty</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="text-muted">{it.stock_no}</td>
                      <td>{it.description}</td>
                      <td>{it.unit}</td>
                      <td>{it.quantity}</td>
                      <td>{it.issued_quantity ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPrint && <RisPrintPreviewModal ris={result} items={items} onClose={() => setShowPrint(false)} />}
    </div>
  )
}
