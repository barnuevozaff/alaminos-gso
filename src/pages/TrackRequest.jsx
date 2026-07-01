import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generatePurchaseRequestPDF } from '../lib/generatePrPdf'
import StatusBadge from '../components/StatusBadge'
import LOGO from '../assets/alaminos-seal.jpeg'

export default function TrackRequest() {
  const [params] = useSearchParams()
  const [prNumber, setPrNumber] = useState(params.get('pr') || '')
  const [result, setResult] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const justSubmitted = params.get('submitted') === '1'

  useEffect(() => {
    if (params.get('pr')) handleTrack(params.get('pr'))
  }, [])

  async function handleTrack(overrideNumber) {
    const value = (overrideNumber || prNumber).trim()
    if (!value) return
    setLoading(true)
    setError('')
    setResult(null)
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('pr_number', value)
      .maybeSingle()

    if (error) { setError(error.message); setLoading(false); return }
    if (!data) { setError(`No request found with PR number "${value}".`); setLoading(false); return }

    const { data: itemsData } = await supabase.from('pr_items_live').select('*').eq('pr_id', data.id).order('sort_order')
    setResult(data)
    setItems(itemsData || [])
    setLoading(false)
  }

  const grandTotal = items.reduce((sum, it) => sum + Number(it.total_cost ?? it.quantity * it.unit_cost), 0)

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    const { data: signatories } = await supabase.from('pdf_signatories').select('*').eq('id', 1).maybeSingle()
    await generatePurchaseRequestPDF(result, items, signatories || {})
    setDownloadingPdf(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="topbar" style={{ background: 'var(--maroon)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Municipality of Alaminos</div>
            <div style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Purchase Request &amp; Inventory Management System</div>
          </div>
        </div>
        <Link to="/" className="btn btn-secondary">← Home</Link>
      </div>

      <div className="page-content" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Track a Purchase Request</h3>

          {justSubmitted && (
            <div className="alert alert-success">Your request was submitted successfully. Save your PR number below to check its status anytime.</div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="form-input"
              placeholder="e.g. PR-2026-00001"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            />
            <button className="btn btn-primary" onClick={() => handleTrack()} disabled={loading}>
              {loading ? 'Searching…' : '🔍 Track'}
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}
        </div>

        {result && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="flex-between">
              <h3 style={{ margin: 0 }}>{result.pr_number}</h3>
              <div className="gap-8">
                <StatusBadge status={result.status} />
                <button className="btn btn-secondary btn-sm" disabled={downloadingPdf} onClick={handleDownloadPdf}>
                  {downloadingPdf ? 'Generating…' : '⬇ PDF'}
                </button>
              </div>
            </div>
            <div className="print-meta-grid" style={{ marginTop: 14 }}>
              <div><strong>Requester:</strong> {result.requester_name}</div>
              <div><strong>Department:</strong> {result.department}</div>
              <div><strong>Date:</strong> {new Date(result.pr_date).toLocaleDateString()}</div>
              <div><strong>Status:</strong> {result.status}</div>
            </div>
            {result.status === 'Rejected' && result.rejection_reason && (
              <div className="alert alert-error" style={{ marginTop: 10 }}><strong>Reason:</strong> {result.rejection_reason}</div>
            )}

            <table className="data-table" style={{ marginTop: 16 }}>
              <thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.item_description}</td>
                    <td>{it.unit}</td>
                    <td>{it.quantity}</td>
                    <td>₱{Number(it.total_cost ?? it.quantity * it.unit_cost).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                  <td style={{ fontWeight: 700 }}>₱{grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
