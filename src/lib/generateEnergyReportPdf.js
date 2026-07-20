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
export async function generateEnergyReportPdf({ mode, periodLabel, rows, summary }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
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

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(mode === 'comparison' ? `For ${periodLabel}` : `For the Period ${periodLabel}`, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin, y + 14, { align: 'right' })
  y += 24

  if (mode === 'comparison') {
    const body = rows.map((r) => [
      r.account_number, r.location, r.meter_number,
      r.current != null ? fmt(r.current) : '—',
      r.previous != null ? fmt(r.previous) : '—',
      r.diff != null ? `${r.diff >= 0 ? '+' : ''}${fmt(r.diff)}` : '—',
      r.status === 'increase' ? 'Increased' : r.status === 'decrease' ? 'Decreased' : 'No Change',
    ])
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Account Number', 'Location', 'Meter Number', 'Current Bill', 'Previous Bill', 'Difference', 'Status']],
      body,
      foot: [['', '', '', 'GRAND TOTAL', fmt(summary.grandTotal), '', '']],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    })
    let finalY = doc.lastAutoTable.finalY + 20
    doc.setFontSize(9)
    doc.text(`Total Accounts: ${rows.length}    Total Increased: ${summary.increased}    Total Decreased: ${summary.decreased}`, margin, finalY)
    if (summary.overall.status !== 'none') {
      finalY += 14
      doc.text(`Overall ${summary.overall.status === 'increase' ? 'Increased' : 'Decreased'} by ₱${fmt(Math.abs(summary.overall.diff))} (${Math.abs(summary.overall.pct).toFixed(1)}%)`, margin, finalY)
    }
    signatureBlock(doc, pageWidth, margin, finalY + 50)
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
