import { fmt } from './fmt.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import sealLogo from '../assets/alaminos-seal.jpeg'
import { MONTH_NAMES } from './energyUtils'

function loadImageAsDataURL(url) {
  return fetch(url)
    .then((res) => res.blob())
    .then((blob) => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    }))
}

/**
 * Generates the Energy Consumption Report PDF matching the printed layout:
 * seal + LGU header, ENERGY CONSUMPTION REPORT title + period, a table whose
 * columns depend on the active report mode, grand total, and a
 * Prepared By / Approved By signature footer.
 */
export async function generateEnergyReportPdf({ mode, periodLabel, rows, summary, threeMonthTrend, trendComparison }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  let y = 50

  try {
    const logoDataUrl = await loadImageAsDataURL(sealLogo)
    doc.addImage(logoDataUrl, 'JPEG', pageWidth / 2 - 24, y - 18, 48, 48)
    y += 40
  } catch {
    // if the logo fails to load, continue without it rather than failing the whole PDF
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('MUNICIPALITY OF ALAMINOS', pageWidth / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Province of Laguna · General Services Office (GSO)', pageWidth / 2, y, { align: 'center' })
  y += 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('ENERGY CONSUMPTION REPORT', pageWidth / 2, y, { align: 'center' })
  y += 18

  const trendPeriodLabel = threeMonthTrend?.length === 3
    ? threeMonthTrend[0].year === threeMonthTrend[2].year
      ? `${threeMonthTrend[0].label} – ${threeMonthTrend[2].label} ${threeMonthTrend[2].year}`
      : `${threeMonthTrend[0].label} ${threeMonthTrend[0].year} – ${threeMonthTrend[2].label} ${threeMonthTrend[2].year}`
    : periodLabel

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(mode === 'comparison' ? `For ${trendPeriodLabel}` : `For the Period ${periodLabel}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, y + 14, { align: 'right' })
  y += 24

  if (mode === 'comparison') {
    // Mirrors the GSO's paper template: one "Monthly Electricity Consumption"
    // table (selected month + the 2 before it as columns, Total Amount as the
    // only row) plus a trailing increase/decrease note — no per-account rows.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Monthly Electricity Consumption', margin, y)
    y += 10

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: pageWidth / 2 },
      tableWidth: pageWidth / 2 - margin - 10,
      head: [['', ...threeMonthTrend.map((p) => p.label)]],
      body: [['Total Amount (Php)', ...threeMonthTrend.map((p) => fmt(p.total))]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(threeMonthTrend.map((_, i) => [i + 1, { halign: 'right' }])),
    })

    const noteText = trendComparison.status !== 'none'
      ? `${trendComparison.status === 'increase' ? 'Increased' : 'Decreased'} by ${Math.abs(trendComparison.pct).toFixed(2)}% compared to previous month`
      : 'No prior month data available for comparison'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    const noteBoxX = pageWidth / 2 + 10
    const noteBoxWidth = pageWidth - margin - noteBoxX
    doc.rect(noteBoxX, y, noteBoxWidth, doc.lastAutoTable.finalY - y)
    doc.text(noteText, noteBoxX + noteBoxWidth / 2, (y + doc.lastAutoTable.finalY) / 2, { align: 'center', maxWidth: noteBoxWidth - 30 })

    signatureBlock(doc, pageWidth, margin, doc.lastAutoTable.finalY + 60)
  } else {
    const body = rows.map((r) => [
      r.account_number, r.location, r.meter_number,
      `${MONTH_NAMES[r.billing_month - 1]} ${r.billing_year}`,
      fmt(r.amount),
    ])
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Account Number', 'Location', 'Meter Number', 'Billing Period', 'Amount']],
      body,
      foot: [['', '', '', 'GRAND TOTAL', fmt(summary.grandTotal)]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' } },
    })
    signatureBlock(doc, pageWidth, margin, doc.lastAutoTable.finalY + 50)
  }

  doc.save(`Energy-Consumption-Report-${periodLabel.replace(/\s+/g, '-')}.pdf`)
}

function signatureBlock(doc, pageWidth, margin, y) {
  const colWidth = (pageWidth - margin * 2) / 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('_______________________', margin, y)
  doc.text('_______________________', margin + colWidth, y)
  y += 14
  doc.text('Prepared By', margin, y)
  doc.text('Approved By', margin + colWidth, y)
}
