// Shared time/date helpers for the Facility Reservation calendars + forms.
// Postgres `time` columns come back from Supabase as "HH:MM:SS" strings.

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart)
}

// Monday of the week containing `date` (local time, Mon-Sun weeks).
export function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// 7 Date objects, Monday through Sunday, starting from `monday`.
export function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function toDateInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// One consistent color per facility, cycling if there are more facilities
// than colors. Stable as long as `facilities` is fetched in the same
// order each time (both calendars sort by name), so a given facility
// always lands on the same color.
export const FACILITY_COLORS = [
  '#7A1F2B', // maroon (brand)
  '#1F7A4D', // green
  '#1A4A7A', // blue
  '#8A6A1C', // gold-dark
  '#6B3FA0', // purple
  '#B3261E', // red
  '#0E7C86', // teal
  '#A34E1F', // orange-brown
]

export function getFacilityColor(facilityId, facilities) {
  const idx = facilities.findIndex((f) => f.id === facilityId)
  if (idx === -1) return FACILITY_COLORS[0]
  return FACILITY_COLORS[idx % FACILITY_COLORS.length]
}
