import { useEffect, useState } from 'react'
import { Trash2, SquarePen, Receipt, X, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { fmt } from '../lib/fmt'
import { fmtDate } from '../lib/dateUtils'
import { MONTH_NAMES } from '../lib/energyUtils'

const BLANK_ACCOUNT = { account_number: '', account_name: '', location: '', meter_number: '' }
const now = new Date()
const BLANK_BILL = { billing_month: now.getMonth() + 1, billing_year: now.getFullYear(), amount: '', remarks: '' }

export default function EnergyAccounts() {
  const toast = useToast()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(BLANK_ACCOUNT)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_ACCOUNT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteAffectedCount, setDeleteAffectedCount] = useState(0)

  const [billsAccount, setBillsAccount] = useState(null)
  const [bills, setBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [billForm, setBillForm] = useState(BLANK_BILL)
  const [editingBillId, setEditingBillId] = useState(null)
  const [deleteBillTarget, setDeleteBillTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('energy_accounts').select('*').order('account_number')
    if (error) setError(error.message)
    setAccounts(data || [])
    setLoading(false)
  }

  function validAccount(a) {
    return a.account_number.trim() && a.location.trim() && a.meter_number.trim()
  }

  async function handleAdd() {
    if (!validAccount(form)) { setError('Account Number, Location, and Meter Number are required.'); return }
    setError('')
    const { error } = await supabase.from('energy_accounts').insert({
      account_number: form.account_number.trim(),
      account_name: form.account_name.trim() || null,
      location: form.location.trim(),
      meter_number: form.meter_number.trim(),
    })
    if (error) { setError(error.message); return }
    setForm(BLANK_ACCOUNT)
    toast.success(`Account "${form.account_number.trim()}" added.`)
    load()
  }

  function startEdit(acc) {
    setEditingId(acc.id)
    setEditForm({ account_number: acc.account_number, account_name: acc.account_name || '', location: acc.location, meter_number: acc.meter_number })
  }

  async function handleUpdate(id) {
    if (!validAccount(editForm)) { setError('Account Number, Location, and Meter Number are required.'); return }
    setError('')
    const { error } = await supabase.from('energy_accounts').update({
      account_number: editForm.account_number.trim(),
      account_name: editForm.account_name.trim() || null,
      location: editForm.location.trim(),
      meter_number: editForm.meter_number.trim(),
    }).eq('id', id)
    if (error) { setError(error.message); return }
    setEditingId(null)
    toast.success('Account updated.')
    load()
  }

  async function confirmDelete(acc) {
    const { count } = await supabase.from('energy_bills').select('*', { count: 'exact', head: true }).eq('account_id', acc.id)
    setDeleteAffectedCount(count || 0)
    setDeleteTarget(acc)
  }

  async function handleDelete() {
    const { error } = await supabase.from('energy_accounts').delete().eq('id', deleteTarget.id)
    if (error) { setError(error.message); setDeleteTarget(null); return }
    toast.success(`Account "${deleteTarget.account_number}" deleted.`)
    setDeleteTarget(null)
    setDeleteAffectedCount(0)
    load()
  }

  async function openBills(acc) {
    setBillsAccount(acc)
    setBillForm(BLANK_BILL)
    setEditingBillId(null)
    setBillsLoading(true)
    const { data } = await supabase.from('energy_bills').select('*').eq('account_id', acc.id)
      .order('billing_year', { ascending: false }).order('billing_month', { ascending: false })
    setBills(data || [])
    setBillsLoading(false)
  }

  async function reloadBills() {
    const { data } = await supabase.from('energy_bills').select('*').eq('account_id', billsAccount.id)
      .order('billing_year', { ascending: false }).order('billing_month', { ascending: false })
    setBills(data || [])
  }

  function startEditBill(bill) {
    setEditingBillId(bill.id)
    setBillForm({ billing_month: bill.billing_month, billing_year: bill.billing_year, amount: bill.amount, remarks: bill.remarks || '' })
  }

  async function handleSaveBill() {
    if (!billForm.amount || Number(billForm.amount) < 0) { toast.error('Enter a valid amount.'); return }
    const { error } = await supabase.from('energy_bills').upsert({
      account_id: billsAccount.id,
      billing_month: Number(billForm.billing_month),
      billing_year: Number(billForm.billing_year),
      amount: Number(billForm.amount),
      remarks: billForm.remarks.trim() || null,
    }, { onConflict: 'account_id,billing_month,billing_year' })
    if (error) { toast.error(error.message); return }
    toast.success(editingBillId ? 'Bill updated.' : 'Bill added.')
    setBillForm(BLANK_BILL)
    setEditingBillId(null)
    reloadBills()
  }

  async function handleDeleteBill() {
    const { error } = await supabase.from('energy_bills').delete().eq('id', deleteBillTarget.id)
    if (error) { toast.error(error.message); setDeleteBillTarget(null); return }
    toast.success('Bill deleted.')
    setDeleteBillTarget(null)
    reloadBills()
  }

  return (
    <Layout>
      <h1 className="page-title">Energy Accounts</h1>
      <p className="page-subtitle">Manage electricity accounts and enter their monthly bills.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Add Account</h3>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="form-label">Account Number *</label>
            <input className="form-input" value={form.account_number} onChange={(e) => { setForm({ ...form, account_number: e.target.value }); setError('') }} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Name (optional)</label>
            <input className="form-input" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Location *</label>
            <input className="form-input" value={form.location} onChange={(e) => { setForm({ ...form, location: e.target.value }); setError('') }} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Meter Number *</label>
            <input className="form-input" value={form.meter_number} onChange={(e) => { setForm({ ...form, meter_number: e.target.value }); setError('') }} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleAdd}><Plus size={16} style={{ marginRight: 6 }} />Add Account</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading accounts…</div>
        ) : accounts.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No energy accounts yet</div>
            Add one above to start recording monthly bills.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Account Number</th><th>Account Name</th><th>Location</th><th>Meter Number</th><th style={{ whiteSpace: 'nowrap', minWidth: 220 }}>Actions</th></tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  {editingId === acc.id ? (
                    <>
                      <td><input className="form-input" value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} /></td>
                      <td><input className="form-input" value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} /></td>
                      <td><input className="form-input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></td>
                      <td><input className="form-input" value={editForm.meter_number} onChange={(e) => setEditForm({ ...editForm, meter_number: e.target.value })} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleUpdate(acc.id)}>Save</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{acc.account_number}</strong></td>
                      <td className="text-muted">{acc.account_name || '—'}</td>
                      <td>{acc.location}</td>
                      <td>{acc.meter_number}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openBills(acc)}><Receipt size={16} style={{ marginRight: 6 }} />Bills</button>
                          <button className="btn btn-outline btn-sm" aria-label={`Edit ${acc.account_number}`} onClick={() => startEdit(acc)}><SquarePen size={16} /></button>
                          <button className="btn btn-danger btn-sm" aria-label={`Delete ${acc.account_number}`} onClick={() => confirmDelete(acc)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this account?"
          message={
            deleteAffectedCount > 0
              ? `"${deleteTarget.account_number}" has ${deleteAffectedCount} bill record${deleteAffectedCount > 1 ? 's' : ''}. Deleting the account will also delete all of its bill history. This cannot be undone.`
              : `"${deleteTarget.account_number}" will be permanently removed.`
          }
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteAffectedCount(0) }}
        />
      )}

      {billsAccount && (
        <div className="modal-overlay" onClick={() => setBillsAccount(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setBillsAccount(null)}><X size={16} /></button>
            <h3 className="modal-title">Monthly Bills — {billsAccount.account_name || billsAccount.account_number}</h3>
            <p className="text-muted" style={{ marginTop: -8, marginBottom: 16 }}>{billsAccount.account_number} · {billsAccount.location} · Meter {billsAccount.meter_number}</p>

            <div className="form-row form-row-3" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select" value={billForm.billing_month} onChange={(e) => setBillForm({ ...billForm, billing_month: Number(e.target.value) })}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={billForm.billing_year} onChange={(e) => setBillForm({ ...billForm, billing_year: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₱)</label>
                <input type="number" min="0" step="0.01" className="form-input" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="form-row" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Remarks (optional)</label>
                <input className="form-input" value={billForm.remarks} onChange={(e) => setBillForm({ ...billForm, remarks: e.target.value })} />
              </div>
              <div className="form-group" style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveBill}>{editingBillId ? 'Save Bill' : 'Add Bill'}</button>
                {editingBillId && <button className="btn btn-secondary" onClick={() => { setEditingBillId(null); setBillForm(BLANK_BILL) }}>Cancel</button>}
              </div>
            </div>

            <div style={{ marginTop: 16, maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              {billsLoading ? (
                <div className="state-box"><div className="spinner"></div>Loading bills…</div>
              ) : bills.length === 0 ? (
                <div className="state-box">No bills recorded yet.</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Amount</th><th>Remarks</th><th>Date Added</th><th></th></tr></thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b.id}>
                        <td>{MONTH_NAMES[b.billing_month - 1]} {b.billing_year}</td>
                        <td>₱{fmt(b.amount)}</td>
                        <td className="text-muted">{b.remarks || '—'}</td>
                        <td className="text-muted">{fmtDate(b.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="icon-btn" aria-label="Edit bill" onClick={() => startEditBill(b)}><SquarePen size={15} /></button>
                            <button className="icon-btn danger" aria-label="Delete bill" onClick={() => setDeleteBillTarget(b)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="print-actions">
              <button className="btn btn-secondary" onClick={() => setBillsAccount(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteBillTarget && (
        <ConfirmDialog
          title="Delete this bill?"
          message={`${MONTH_NAMES[deleteBillTarget.billing_month - 1]} ${deleteBillTarget.billing_year} — ₱${fmt(deleteBillTarget.amount)} will be permanently removed.`}
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={handleDeleteBill}
          onCancel={() => setDeleteBillTarget(null)}
        />
      )}
    </Layout>
  )
}
