import { fmtDate } from '../lib/dateUtils'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCheck, faArrowLeft, faPrint, faFilePdf } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { generateRequisitionIssueSlipPDF } from '../lib/generateRisPdf'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import RisPrintPreviewModal from '../components/RisPrintPreviewModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function RisRequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [ris, setRis] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // 'approve' | 'reject' | null
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: risData, error: risErr }, { data: itemsData }] = await Promise.all([
      supabase.from('requisition_issue_slips').select('*').eq('id', id).single(),
      supabase.from('ris_items').select('*').eq('ris_id', id).order('sort_order'),
    ])
    if (risErr) setError(risErr.message)
    setRis(risData)
    setItems(itemsData || [])
    setLoading(false)
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true)
    const { data: freshItems } = await supabase.from('ris_items').select('*').eq('ris_id', id).order('sort_order')
    await generateRequisitionIssueSlipPDF(ris, freshItems || items)
    setGeneratingPdf(false)
  }

  async function handleApprove() {
    setBusy(true)
    const { error } = await supabase.rpc('approve_requisition_issue_slip', { p_ris_id: id, p_user_id: user.id })
    setBusy(false)
    setConfirmAction(null)
    if (error) { setError(error.message); return }
    load()
  }

  async function handleReject() {
    setBusy(true)
    const { error } = await supabase.rpc('reject_requisition_issue_slip', {
      p_ris_id: id, p_user_id: user.id, p_reason: rejectReason || null,
    })
    setBusy(false)
    setConfirmAction(null)
    if (error) { setError(error.message); return }
    load()
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading request…</div></Layout>
  if (!ris) return <Layout><div className="state-box">Request not found.</div></Layout>

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div>
          <button className="btn-signout" style={{ width: 'auto', background: 'none', border: 'none', color: 'var(--text)', padding: 0, marginBottom: 8 }} onClick={() => navigate('/admin/ris')}><FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{ris.ris_number}</h1>
            <StatusBadge status={ris.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            {ris.submitted_at ? `Submitted ${new Date(ris.submitted_at).toLocaleString()}` : 'Not yet submitted'}
          </p>
        </div>
        <div className="gap-8">
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)}><FontAwesomeIcon icon={faPrint} style={{ marginRight: 6 }} />Print</button>
          <button className="btn btn-secondary" disabled={generatingPdf} onClick={handleDownloadPdf}>
            <FontAwesomeIcon icon={faFilePdf} style={{ marginRight: 6 }} />{generatingPdf ? 'Generating…' : 'Download PDF'}
          </button>
          {ris.status === 'Submitted' && (
            <>
              <button className="btn btn-danger" disabled={busy} onClick={() => setConfirmAction('reject')}><FontAwesomeIcon icon={faXmark} style={{ marginRight: 6 }} />Reject</button>
              <button className="btn btn-success" disabled={busy} onClick={() => setConfirmAction('approve')}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Approve</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Details</h3>
        <div className="print-meta-grid">
          <div><strong>Requested by:</strong> {ris.requester_name}</div>
          <div><strong>Office:</strong> {ris.office}</div>
          <div><strong>Date:</strong> {fmtDate(ris.ris_date)}</div>
          <div><strong>RIS No.:</strong> {ris.ris_number}</div>
          <div><strong>Fund:</strong> {ris.fund || '—'}</div>
          <div><strong>Division:</strong> {ris.division || '—'}</div>
          <div><strong>FPP Code:</strong> {ris.fpp_code || '—'}</div>
        </div>
        <div><strong>Purpose:</strong> {ris.purpose || '—'}</div>
        {ris.status === 'Rejected' && ris.rejection_reason && (
          <div className="alert alert-error" style={{ marginTop: 14 }}><strong>Rejection reason:</strong> {ris.rejection_reason}</div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '16px 22px 0' }}><h3 style={{ margin: 0 }}>Requisition Items</h3></div>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Stock No.</th><th>Unit</th><th>Description</th><th>Requested Qty</th><th>Issued Qty</th></tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td>{idx + 1}</td>
                <td className="text-muted">{it.stock_no}</td>
                <td>{it.unit}</td>
                <td><strong>{it.description}</strong></td>
                <td>{it.quantity}</td>
                <td>{it.issued_quantity ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPrint && <RisPrintPreviewModal ris={ris} items={items} onClose={() => setShowPrint(false)} />}

      {confirmAction === 'approve' && (
        <ConfirmDialog
          title="Approve this request?"
          message={`Approving ${ris.ris_number} will deduct the requested quantities from RIS inventory. This cannot be undone.`}
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
