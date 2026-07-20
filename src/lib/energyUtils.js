export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// current - previous → { diff, pct, status }. previous == null means no
// prior bill exists for that account (nothing to compare against yet).
export function compareAmounts(current, previous) {
  if (previous == null) return { diff: null, pct: null, status: 'none' }
  const diff = current - previous
  const pct = previous === 0 ? (diff === 0 ? 0 : 100) : (diff / previous) * 100
  const status = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'none'
  return { diff, pct, status }
}

// Sortable "YYYY-MM" style key for ordering/comparing billing periods.
export function periodKey(year, month) {
  return year * 12 + month
}

export function previousPeriod(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

export function nextPeriod(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}
