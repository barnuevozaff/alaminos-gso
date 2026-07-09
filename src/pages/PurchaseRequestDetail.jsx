import { fmt } from '../lib/fmt.js'
import { capitalizeUnit } from '../lib/units'
import { fmtDate } from '../lib/dateUtils'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Printer, X, Check, ArrowLeft, FileDown, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { generatePurchaseRequestPDF } from '../lib/generatePrPdf'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import PrintPreviewModal from '../components/PrintPreviewModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PurchaseRequestDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [pr, setPr] = useState(null)
  const [items, setItems] = useState([])
  const [linkedPo, setLinkedPo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // 'approve' | 'reject' | null
  const [rejectReason, setRejectReason] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: prData, error: prErr }, { data: itemsData }, { data: linkedPoData }] = await Promise.all([
      supabase.from('purchase_requests').select('*').eq('id', id).single(),
      supabase.from('pr_items_live').select('*').eq('pr_id', id).order('sort_order'),
      supabase.from('purchase_orders').select('id, po_number, status').eq('pr_id', id).maybeSingle(),
    ])
    if (prErr) setError(prErr.message)
    setPr(prData)
    setItems(itemsData || [])
    setLinkedPo(linkedPoData)
    setLoading(false)
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true)
    // Re-fetch items fresh so the PDF always reflects the current Inventory price,
    // even if pricing changed since this page loaded.
    const { data: freshItems } = await supabase.from('pr_items_live').select('*').eq('pr_id', id).order('sort_order')
    const { data: signatories } = await supabase.from('pdf_signatories').select('*').eq('id', 1).maybeSingle()
    await generatePurchaseRequestPDF(pr, freshItems || items, signatories || {})
    setGeneratingPdf(false)
  }

  async function handleApprove() {
    setBusy(true)
    const { error } = await supabase.rpc('approve_purchase_request', { p_pr_id: id, p_user_id: user.id })
    setBusy(false)
    setConfirmAction(null)
    if (error) { setError(error.message); return }
    load()
  }

  async function handleReject() {
    setBusy(true)
    const { error } = await supabase.rpc('reject_purchase_request', {
      p_pr_id: id, p_user_id: user.id, p_reason: rejectReason || null,
    })
    setBusy(false)
    setConfirmAction(null)
    if (error) { setError(error.message); return }
    load()
  }

  async function handleGeneratePo() {
    setBusy(true)
    setError('')
    try {
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          pr_id: id,
          pr_numbers: pr.pr_number,
          po_date: new Date().toISOString().slice(0, 10),
          address: 'ALAMINOS, LAGUNA',
          delivery_term: '7 working Days',
          payment_term: 'Cash',
          mayor_name: 'Hon. ERICSON R. LOPEZ',
          bac_secretary_name: 'NEMIA B. MONZONES',
          created_by: profile?.id,
        })
        .select()
        .single()
      if (poErr) throw poErr

      if (items.length) {
        const rows = items.map((it, idx) => ({
          po_id: po.id,
          unit: it.unit,
          description: it.item_description,
          quantity: it.quantity,
          unit_cost: it.unit_cost ?? 0,
          sort_order: idx,
        }))
        const { error: itemsErr } = await supabase.from('po_items').insert(rows)
        if (itemsErr) throw itemsErr
      }

      navigate(`/admin/purchase-orders/${po.id}`)
    } catch (e) {
      setError(e.message || 'Failed to generate Purchase Order.')
      setBusy(false)
    }
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading request…</div></Layout>
  if (!pr) return <Layout><div className="state-box"><div className="state-title">Request not found</div>It may have been deleted or the link is incorrect.</div></Layout>

  const grandTotal = items.reduce((sum, it) => sum + Number(it.total_cost ?? it.quantity * it.unit_cost), 0)

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div>
          <button className="btn-back" onClick={() => navigate('/admin/requests')}><ArrowLeft size={16} />Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{pr.pr_number}</h1>
            <StatusBadge status={pr.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            {pr.submitted_at ? `Submitted ${new Date(pr.submitted_at).toLocaleString()}` : 'Not yet submitted'}
          </p>
        </div>
        <div className="gap-8">
          {pr.status === 'Draft' && <button className="btn btn-secondary" onClick={() => navigate(`/admin/requests/${id}/edit`)}>Edit</button>}
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)}><Printer size={16} style={{ marginRight: 6 }} />Print</button>
          <button className="btn btn-secondary" disabled={generatingPdf} onClick={handleDownloadPdf}>
            <FileDown size={16} style={{ marginRight: 6 }} />{generatingPdf ? 'Generating…' : 'Download PDF'}
          </button>
          {pr.status === 'Submitted' && (
            <>
              <button className="btn btn-danger" disabled={busy} onClick={() => setConfirmAction('reject')}><X size={16} style={{ marginRight: 6 }} />Reject</button>
              <button className="btn btn-success" disabled={busy} onClick={() => setConfirmAction('approve')}><Check size={16} style={{ marginRight: 6 }} />Approve</button>
            </>
          )}
          {pr.status === 'Approved' && !linkedPo && (
            <button className="btn btn-primary" disabled={busy} onClick={handleGeneratePo}>
              <FileSpreadsheet size={16} style={{ marginRight: 6 }} />
              {busy ? 'Generating…' : 'Generate Purchase Order'}
            </button>
          )}
          {linkedPo && (
            <button className="btn btn-secondary" onClick={() => navigate(`/admin/purchase-orders/${linkedPo.id}`)}>
              <FileSpreadsheet size={16} style={{ marginRight: 6 }} />View Purchase Order
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Linked PO banner */}
      {linkedPo && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileSpreadsheet size={22} style={{ color: 'var(--green)' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Linked Purchase Order</div>
              <div className="text-muted" style={{ fontSize: 13 }}>{linkedPo.po_number} · <StatusBadge status={linkedPo.status} /></div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/purchase-orders/${linkedPo.id}`)}>
            <FileSpreadsheet size={16} style={{ marginRight: 6 }} />View PO
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Details</h3>
        <div className="print-meta-grid">
          <div><strong>Requester:</strong> {pr.requester_name}</div>
          <div><strong>Department:</strong> {pr.department}</div>
          <div><strong>Date:</strong> {fmtDate(pr.pr_date)}</div>
          <div><strong>PR No.:</strong> {pr.pr_number}</div>
        </div>
        <div><strong>Purpose / Remarks:</strong> {pr.purpose || '—'}</div>
        {pr.status === 'Rejected' && pr.rejection_reason && (
          <div className="alert alert-error" style={{ marginTop: 14 }}><strong>Rejection reason:</strong> {pr.rejection_reason}</div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '16px 22px 0' }}><h3 style={{ margin: 0 }}>Requested Items</h3></div>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Unit</th><th>Item Description</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th></tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td>{idx + 1}</td>
                <td>{capitalizeUnit(it.unit)}</td>
                <td><strong>{it.item_description}</strong></td>
                <td>{it.quantity}</td>
                <td>₱{fmt(it.unit_cost)}</td>
                <td>₱{fmt(it.total_cost ?? it.quantity * it.unit_cost)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
              <td style={{ fontWeight: 700 }}>₱{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showPrint && <PrintPreviewModal pr={pr} items={items} onClose={() => setShowPrint(false)} />}

      {confirmAction === 'approve' && (
        <ConfirmDialog
          title="Approve this request?"
          message={`Approving ${pr.pr_number} will deduct the requested quantities from inventory. This cannot be undone.`}
          confirmLabel="Approve"
          confirmClass="btn-success"
          busy={busy}
          onConfirm={handleApprove}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'reject' && (
        <ConfirmDialog
          title="Reject this request?"
          message="Optionally provide a reason for the requester."
          confirmLabel="Reject"
          confirmClass="btn-danger"
          busy={busy}
          onConfirm={handleReject}
          onCancel={() => setConfirmAction(null)}
        >
          <textarea
            className="form-textarea"
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </ConfirmDialog>
      )}
    </Layout>
  )
}
