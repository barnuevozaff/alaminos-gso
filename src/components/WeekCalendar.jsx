import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekDates, timeToMinutes, formatTime12h, getFacilityColor } from '../lib/facilityTime'

const DAY_START_MIN = 6 * 60   // 6:00 AM
const DAY_END_MIN = 21 * 60    // 9:00 PM
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN
const HOUR_LABELS = Array.from({ length: 15 }, (_, i) => 6 + i) // 6..20, each label marks the top of its hour row
const BLOCK_GAP_PX = 3 // visual gap between side-by-side blocks

function hourLabel(h) {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${period}`
}

// Lays out one day's reservations so overlapping ones sit side-by-side
// instead of stacking on top of each other. Two passes:
//  1) split the (start-time sorted) list into clusters of transitively
//     overlapping reservations (A-B overlap, B-C overlap => all 3 share
//     a cluster even if A-C don't directly overlap);
//  2) within each cluster, greedily assign each reservation to the first
//     column whose previous occupant already ended (else open a new
//     column) — the same approach Google Calendar/Outlook use for day views.
// Every reservation in a cluster gets the same `totalColumns`, so they
// all resize together to evenly split the day column's width.
function layoutDayReservations(dayReservations) {
  if (dayReservations.length === 0) return []
  const sorted = [...dayReservations].sort((a, b) => {
    const byStart = timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    if (byStart !== 0) return byStart
    return timeToMinutes(b.end_time) - timeToMinutes(a.end_time)
  })

  const clusters = []
  let current = []
  let currentMaxEnd = -Infinity
  for (const r of sorted) {
    const start = timeToMinutes(r.start_time)
    const end = timeToMinutes(r.end_time)
    if (current.length > 0 && start < currentMaxEnd) {
      current.push(r)
      currentMaxEnd = Math.max(currentMaxEnd, end)
    } else {
      if (current.length > 0) clusters.push(current)
      current = [r]
      currentMaxEnd = end
    }
  }
  if (current.length > 0) clusters.push(current)

  const placed = []
  for (const cluster of clusters) {
    const columnEndTimes = []
    const clusterPlaced = []
    for (const r of cluster) {
      const start = timeToMinutes(r.start_time)
      const end = timeToMinutes(r.end_time)
      let columnIndex = columnEndTimes.findIndex((endTime) => endTime <= start)
      if (columnIndex === -1) {
        columnIndex = columnEndTimes.length
        columnEndTimes.push(end)
      } else {
        columnEndTimes[columnIndex] = end
      }
      clusterPlaced.push({ reservation: r, columnIndex })
    }
    const totalColumns = columnEndTimes.length
    for (const p of clusterPlaced) placed.push({ ...p, totalColumns })
  }
  return placed
}

// Shared weekly time-grid calendar (Mon-Sun, 6AM-9PM), used by both the
// public reservation form and the admin monitoring calendar. Shows every
// facility together in one grid, color-coded per facility (see the legend).
// Overlapping reservations (even across different facilities) are laid
// out side-by-side rather than stacked, via layoutDayReservations() above.
// mode="public" shows only the facility name + time on each block;
// mode="admin" shows the borrower name + time, and supports onBlockClick
// for a full detail modal.
export default function WeekCalendar({ weekStart, reservations, facilities, mode = 'public', onWeekChange, onBlockClick }) {
  const days = getWeekDates(weekStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function goToWeek(offsetDays) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offsetDays)
    onWeekChange(d)
  }

  const dayLayouts = useMemo(() => {
    return days.map((day) => {
      const y = day.getFullYear(), m = day.getMonth(), d = day.getDate()
      const dayReservations = reservations.filter((r) => {
        const rd = new Date(r.reservation_date + 'T00:00:00')
        return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d
      })
      return layoutDayReservations(dayReservations)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, weekStart])

  return (
    <div className="week-calendar">
      <div className="week-calendar-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => goToWeek(-7)} aria-label="Previous week">
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
          {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' – '}
          {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={() => goToWeek(7)} aria-label="Next week">
          <ChevronRight size={16} />
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => onWeekChange(new Date())} style={{ marginLeft: 'auto' }}>
          This Week
        </button>
      </div>

      {facilities?.length > 0 && (
        <div className="week-calendar-legend">
          {facilities.map((f) => (
            <span key={f.id} className="week-calendar-legend-item">
              <span className="week-calendar-legend-dot" style={{ background: getFacilityColor(f.id, facilities) }} />
              {f.name}
            </span>
          ))}
        </div>
      )}

      <div className="week-calendar-scroll">
        <div className="week-calendar-grid">
          <div className="week-calendar-gutter">
            <div className="week-calendar-daylabel" />
            {HOUR_LABELS.map((h) => (
              <div key={h} className="week-calendar-hourlabel">{hourLabel(h)}</div>
            ))}
          </div>

          {days.map((day, i) => {
            const isToday = day.getTime() === today.getTime()
            return (
              <div key={i} className="week-calendar-day">
                <div className={`week-calendar-daylabel${isToday ? ' is-today' : ''}`}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{day.getDate()}</div>
                </div>
                <div className="week-calendar-column">
                  {HOUR_LABELS.map((h) => (
                    <div key={h} className="week-calendar-hourline" />
                  ))}
                  {dayLayouts[i].map(({ reservation: r, columnIndex, totalColumns }) => {
                    const startMin = Math.max(timeToMinutes(r.start_time), DAY_START_MIN)
                    const endMin = Math.min(timeToMinutes(r.end_time), DAY_END_MIN)
                    if (endMin <= startMin) return null
                    const top = ((startMin - DAY_START_MIN) / TOTAL_MIN) * 100
                    const height = ((endMin - startMin) / TOTAL_MIN) * 100
                    const color = getFacilityColor(r.facility_id, facilities || [])
                    const label = mode === 'admin' ? r.borrower_name : (r.facilities?.name || '')
                    const widthPct = 100 / totalColumns
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="week-calendar-block"
                        style={{
                          top: `${top}%`, height: `${height}%`,
                          left: `calc(${columnIndex * widthPct}% + ${BLOCK_GAP_PX}px)`,
                          width: `calc(${widthPct}% - ${BLOCK_GAP_PX * 2}px)`,
                          background: `${color}1f`, borderColor: `${color}4d`, borderLeftColor: color,
                        }}
                        onClick={onBlockClick ? () => onBlockClick(r) : undefined}
                        disabled={!onBlockClick}
                      >
                        <div className="week-calendar-block-name" style={{ color }}>{label}</div>
                        <div className="week-calendar-block-time">
                          {formatTime12h(r.start_time)} – {formatTime12h(r.end_time)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
