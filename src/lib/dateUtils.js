// Parse a date-only string (YYYY-MM-DD) as local time, not UTC.
// Without this, JS treats "2026-07-01" as UTC midnight, which shifts one day
// behind when displayed in UTC+8 (e.g., shows June 30 instead of July 1).
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  // If it already includes time info, use it as-is
  if (dateStr.includes('T') || dateStr.includes(' ')) return new Date(dateStr)
  return new Date(dateStr + 'T00:00:00')
}

export function fmtDate(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d || isNaN(d)) return '—'
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
