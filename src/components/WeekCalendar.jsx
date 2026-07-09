import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekDates, timeToMinutes, formatTime12h } from '../lib/facilityTime'

const DAY_START_MIN = 6 * 60   // 6:00 AM
const DAY_END_MIN = 21 * 60    // 9:00 PM
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN
const HOUR_LABELS = Array.from({ length: 15 }, (_, i) => 6 + i) // 6..20, each label marks the top of its hour row

function hourLabel(h) {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${period}`
}

// Shared weekly time-grid calendar (Mon-Sun, 6AM-9PM), used by both the
// public reservation form and the admin monitoring calendar.
export default function WeekCalendar({ weekStart, reservations, onWeekChange, onBlockClick }) {
  const days = getWeekDates(weekStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function goToWeek(offsetDays) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offsetDays)
    onWeekChange(d)
  }

  function reservationsForDay(day) {
    const y = day.getFullYear(), m = day.getMonth(), d = day.getDate()
    return reservations.filter((r) => {
      const rd = new Date(r.reservation_date + 'T00:00:00')
      return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d
    })
  }

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
            const dayReservations = reservationsForDay(day)
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
                  {dayReservations.map((r) => {
                    const startMin = Math.max(timeToMinutes(r.start_time), DAY_START_MIN)
                    const endMin = Math.min(timeToMinutes(r.end_time), DAY_END_MIN)
                    if (endMin <= startMin) return null
                    const top = ((startMin - DAY_START_MIN) / TOTAL_MIN) * 100
                    const height = ((endMin - startMin) / TOTAL_MIN) * 100
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="week-calendar-block"
                        style={{ top: `${top}%`, height: `${height}%` }}
                        onClick={onBlockClick ? () => onBlockClick(r) : undefined}
                        disabled={!onBlockClick}
                      >
                        <div className="week-calendar-block-name">{r.borrower_name}</div>
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
