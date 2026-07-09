import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getMonday, toDateInputValue, formatTime12h } from '../lib/facilityTime'
import WeekCalendar from '../components/WeekCalendar'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import LOGO from '../assets/alaminos-seal.png'

const BLANK_ITEM = () => ({ item_name: '', quantity: 1 })

export default function PublicFacilityReservationForm() {
  const navigate = useNavigate()
  const toast = useToast()

  const [facilities, setFacilities] = useState([])
  const [facilityId, setFacilityId] = useState('')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [reservations, setReservations] = useState([])

  const [reservationDate, setReservationDate] = useState(toDateInputValue(new Date()))
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [organization, setOrganization] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([BLANK_ITEM()])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('facilities').select('*').order('name').then(({ data }) => {
      setFacilities(data || [])
      if (data?.length) setFacilityId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!facilityId) return
    loadReservations()
    const interval = setInterval(loadReservations, 20000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, weekStart])

  async function loadReservations() {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const { data } = await supabase
      .from('facility_reservations')
      .select('id, borrower_name, reservation_date, start_time, end_time')
      .eq('facility_id', facilityId)
      .gte('reservation_date', toDateInputValue(weekStart))
      .lte('reservation_date', toDateInputValue(weekEnd))
    setReservations(data || [])
  }

  const canContinue = facilityId && reservationDate && startTime && endTime && endTime > startTime

  function addItemRow() {
    setItems((prev) => [...prev, BLANK_ITEM()])
  }
  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function validateStep2() {
    if (!fullName.trim()) return 'Full name is required.'
    if (!contactNumber.trim()) return 'Contact number is required.'
    if (!purpose.trim()) return 'Purpose of reservation is required.'
    for (const it of items) {
      if (it.item_name.trim() && (!it.quantity || Number(it.quantity) <= 0)) {
        return `Enter a valid quantity for "${it.item_name}".`
      }
    }
    return ''
  }

  function handleReview() {
    const err = validateStep2()
    if (err) { setError(err); return }
    setError('')
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    try {
      const validItems = items.filter((it) => it.item_name.trim()).map((it) => ({
        item_name: it.item_name.trim(),
        quantity: Number(it.quantity),
      }))
      const { error: rpcErr } = await supabase.rpc('create_facility_reservation', {
        p_facility_id: facilityId,
        p_date: reservationDate,
        p_start: startTime,
        p_end: endTime,
        p_borrower: fullName.trim(),
        p_contact: contactNumber.trim(),
        p_org: organization.trim(),
        p_purpose: purpose.trim(),
        p_notes: notes.trim(),
        p_items: validItems,
      })
      if (rpcErr) throw rpcErr

      toast.success('Reservation confirmed!')
      setConfirmOpen(false)
      setStep(1)
      setFullName(''); setContactNumber(''); setOrganization(''); setPurpose(''); setNotes('')
      setItems([BLANK_ITEM()])
      setStartTime(''); setEndTime('')
      loadReservations()
    } catch (e) {
      setConfirmOpen(false)
      setError(e.message || 'Something went wrong while submitting your reservation.')
    } finally {
      setSubmitting(false)
    }
  }

  const facilityName = facilities.find((f) => f.id === facilityId)?.name || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="public-topbar">
        <div className="public-topbar-brand">
          <img src={LOGO} alt="" onError={(e) => { e.target.style.visibility = 'hidden' }} />
          <div>
            <div className="org-name" style={{ color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Municipality of Alaminos</div>
            <div className="gso-name" style={{ fontWeight: 700, color: '#fff' }}>General Services Office (GSO)</div>
            <div className="sys-name" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Facility Reservation</div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 className="page-title">Reserve a Facility</h1>
        <p className="page-subtitle">
          {step === 1 ? 'Pick a facility, date, and time. Reservations are confirmed instantly.' : 'A few more details to complete your reservation.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ margin: 0 }}>Facility Calendar</h3>
                <select className="form-select" style={{ minWidth: 200 }} value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                  {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <WeekCalendar weekStart={weekStart} reservations={reservations} onWeekChange={setWeekStart} />
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Select Date &amp; Time</h3>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={reservationDate}
                    onChange={(e) => { setReservationDate(e.target.value); setWeekStart(getMonday(new Date(e.target.value + 'T00:00:00'))) }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input type="time" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input type="time" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              {startTime && endTime && endTime <= startTime && (
                <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>End time must be after start time.</p>
              )}
            </div>

            <div className="print-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button className="btn btn-primary" disabled={!canContinue} onClick={() => setStep(2)}>Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Borrower Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input className="form-input" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization (optional)</label>
                  <input className="form-input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose of Reservation *</label>
                  <input className="form-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Notes (optional)</label>
                <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Items to Borrow (optional)</h3>
              <p className="text-muted" style={{ marginTop: -8, fontSize: 13 }}>Type item names manually — not linked to inventory stock.</p>
              {items.map((it, idx) => (
                <div key={idx} className="form-row" style={{ gridTemplateColumns: '1fr 120px 40px', alignItems: 'end', marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Item {idx + 1}</label>
                    <input className="form-input" placeholder="e.g. Basketball" value={it.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Quantity</label>
                    <input type="number" min="1" className="form-input" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <button className="icon-btn danger" style={{ marginBottom: 10 }} onClick={() => removeItem(idx)} aria-label="Remove item"><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={addItemRow}><Plus size={14} style={{ marginRight: 6 }} />Add Item</button>
            </div>

            <div className="print-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={handleReview}>Review Reservation</button>
            </div>
          </>
        )}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Confirm Reservation"
          message="Please review your reservation details before confirming."
          confirmLabel="Confirm Reservation"
          confirmClass="btn-primary"
          busy={submitting}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 14, fontSize: 13.5, lineHeight: 1.9, marginBottom: 4 }}>
            <div><strong>Facility:</strong> {facilityName}</div>
            <div><strong>Date:</strong> {new Date(reservationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div><strong>Time:</strong> {formatTime12h(startTime)} – {formatTime12h(endTime)}</div>
            <div><strong>Borrower:</strong> {fullName}</div>
            <div><strong>Purpose:</strong> {purpose}</div>
            <div><strong>Items Requested:</strong> {items.filter((i) => i.item_name.trim()).length === 0 ? 'None' : items.filter((i) => i.item_name.trim()).map((i) => `${i.item_name} (${i.quantity})`).join(', ')}</div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
