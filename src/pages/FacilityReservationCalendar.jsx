import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getMonday, toDateInputValue, formatTime12h } from '../lib/facilityTime'
import { fmtDate } from '../lib/dateUtils'
import Layout from '../components/Layout'
import WeekCalendar from '../components/WeekCalendar'

export default function FacilityReservationCalendar() {
  const [facilities, setFacilities] = useState([])
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [reservations, setReservations] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('facilities').select('*').order('name').then(({ data }) => setFacilities(data || []))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 20000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  async function load(silent = false) {
    if (!silent) setLoading(true)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const { data } = await supabase
      .from('facility_reservations')
      .select('*, facilities(name), facility_reservation_items(item_name, quantity)')
      .gte('reservation_date', toDateInputValue(weekStart))
      .lte('reservation_date', toDateInputValue(weekEnd))
    setReservations(data || [])
    setLoading(false)
  }

  return (
    <Layout>
      <h1 className="page-title">Facility Calendar</h1>
      <p className="page-subtitle">Monitoring only — all bookings are already confirmed.</p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Weekly Schedule</h3>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading calendar…</div>
        ) : (
          <WeekCalendar weekStart={weekStart} reservations={reservations} facilities={facilities} mode="admin" onWeekChange={setWeekStart} onBlockClick={setDetail} />
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setDetail(null)}><X size={16} /></button>
            <h3 className="modal-title">{detail.reservation_number}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div><strong>Facility:</strong> {detail.facilities?.name || '—'}</div>
              <div><strong>Borrower:</strong> {detail.borrower_name}</div>
              <div><strong>Date:</strong> {fmtDate(detail.reservation_date)}</div>
              <div><strong>Time:</strong> {formatTime12h(detail.start_time)} – {formatTime12h(detail.end_time)}</div>
              <div><strong>Contact Number:</strong> {detail.contact_number}</div>
              {detail.organization && <div><strong>Organization:</strong> {detail.organization}</div>}
              <div><strong>Purpose:</strong> {detail.purpose}</div>
              <div>
                <strong>Items Requested:</strong>{' '}
                {detail.facility_reservation_items?.length
                  ? detail.facility_reservation_items.map((i) => `${i.item_name} (${i.quantity})`).join(', ')
                  : 'None'}
              </div>
              {detail.notes && <div><strong>Notes:</strong> {detail.notes}</div>}
              <div className="text-muted" style={{ fontSize: 12.5 }}>
                Created {new Date(detail.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
