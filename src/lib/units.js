export const UNITS = ['piece', 'ream', 'box', 'pack', 'bottle', 'gallon', 'unit', 'set', 'roll']

// Units are stored lowercase (matches the UNITS option list above) — this is
// purely a display formatter, never used for storage/comparison.
export function capitalizeUnit(unit) {
  if (!unit) return ''
  return unit.charAt(0).toUpperCase() + unit.slice(1)
}
