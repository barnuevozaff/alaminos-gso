import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatTime12h } from '../lib/facilityTime'
import { fmtDate } from '../lib/dateUtils'
import Layout from '../components/Layout'

const PAGE_SIZE = 15

export default function FacilityReservationsList() {
  const [reservations, setReservations] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [sortBy, setSortBy] = useState('reservation_date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: resData, error: resErr }, { data: facData }] = await Promise.all([
      supabase
        .from('facility_reservations')
        .select('*, facilities(name), facility_reservation_items(item_name, quantity)')
        .order('created_at', { ascending: false }),
      supabase.from('facilities').select('*').order('name'),
    ])
    if (resErr) setError(resErr.message)
    setReservations(resData || [])
    setFacilities(facData || [])
    setLoading(false)
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const rows = reservations.filter((r) => {
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        r.reservation_number?.toLowerCase().includes(q) ||
        r.borrower_name?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q)
      const matchesFacility = facilityFilter === 'all' || r.facility_id === facilityFilter
      const matchesDate = !dateFilter || r.reservation_date === dateFilter
      const matchesMonth = !monthFilter || r.reservation_date?.slice(0, 7) === monthFilter
      return matchesSearch && matchesFacility && matchesDate && matchesMonth
    })
    const dir = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      let av, bv
      if (sortBy === 'facility') { av = a.facilities?.name || ''; bv = b.facilities?.name || '' }
      else if (sortBy === 'borrower_name') { av = a.borrower_name || ''; bv = b.borrower_name || '' }
      else { av = `${a.reservation_date} ${a.start_time}`; bv = `${b.reservation_date} ${b.start_time}` }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
    })
    return rows
  }, [reservations, search, facilityFilter, dateFilter, monthFilter, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function SortHeader({ col, children }) {
    const active = sortBy === col
    return (
      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(col)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {children}
          {active && (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </span>
      </th>
    )
  }

  return (
    <Layout>
      <h1 className="page-title">Facility Reservations</h1>
      <p className="page-subtitle">All confirmed facility bookings — view only, no approval needed.</p>

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="gap-8">
          <input
            type="text"
            className="form-input"
            placeholder="Search reservation #, borrower, or purpose…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <select className="form-select" value={facilityFilter} onChange={(e) => { setFacilityFilter(e.target.value); setPage(1) }}>
            <option value="all">All facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input type="date" className="form-input" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setMonthFilter(''); setPage(1) }} />
          <input type="month" className="form-input" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setDateFilter(''); setPage(1) }} />
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading reservations…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No reservations found</div>
            Try adjusting your search or filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reservation #</th>
                <SortHeader col="borrower_name">Borrower</SortHeader>
                <SortHeader col="facility">Facility</SortHeader>
                <SortHeader col="reservation_date">Date</SortHeader>
                <th>Start</th>
                <th>End</th>
                <th>Purpose</th>
                <th>Requested Items</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.reservation_number}</strong></td>
                  <td>{r.borrower_name}</td>
                  <td>{r.facilities?.name || '—'}</td>
                  <td>{fmtDate(r.reservation_date)}</td>
                  <td>{formatTime12h(r.start_time)}</td>
                  <td>{formatTime12h(r.end_time)}</td>
                  <td>{r.purpose}</td>
                  <td className="text-muted">
                    {r.facility_reservation_items?.length
                      ? r.facility_reservation_items.map((i) => `${i.item_name} (${i.quantity})`).join(', ')
                      : '—'}
                  </td>
                  <td className="text-muted">{new Date(r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{filtered.length} reservation{filtered.length > 1 ? 's' : ''} · Page {page} of {totalPages}</span>
          <div className="gap-8">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} style={{ marginRight: 4 }} />Prev
            </button>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next<ChevronRight size={14} style={{ marginLeft: 4 }} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
