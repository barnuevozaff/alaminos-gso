import * as XLSX from 'xlsx'
import { MONTH_NAMES } from './energyUtils'

/**
 * Exports the active Energy Consumption Report table (comparison or
 * date-range mode) to a .xlsx workbook, with a grand-total row appended.
 */
export function generateEnergyReportExcel({ mode, periodLabel, rows, summary }) {
  let data
  if (mode === 'comparison') {
    data = rows.map((r) => ({
      'Account Number': r.account_number,
      'Location': r.location,
      'Meter Number': r.meter_number,
      'Current Bill (₱)': r.current != null ? r.current : '',
      'Previous Bill (₱)': r.previous != null ? r.previous : '',
      'Difference (₱)': r.diff != null ? r.diff : '',
      'Status': r.status === 'increase' ? 'Increased' : r.status === 'decrease' ? 'Decreased' : 'No Change',
    }))
    data.push({
      'Account Number': '', 'Location': '', 'Meter Number': '',
      'Current Bill (₱)': 'GRAND TOTAL', 'Previous Bill (₱)': summary.grandTotal, 'Difference (₱)': '', 'Status': '',
    })
  } else {
    data = rows.map((r) => ({
      'Account Number': r.account_number,
      'Location': r.location,
      'Meter Number': r.meter_number,
      'Billing Period': `${MONTH_NAMES[r.billing_month - 1]} ${r.billing_year}`,
      'Amount (₱)': r.amount,
    }))
    data.push({
      'Account Number': '', 'Location': '', 'Meter Number': '',
      'Billing Period': 'GRAND TOTAL', 'Amount (₱)': summary.grandTotal,
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Energy Report')
  XLSX.writeFile(workbook, `Energy-Consumption-Report-${periodLabel.replace(/\s+/g, '-')}.xlsx`)
}
