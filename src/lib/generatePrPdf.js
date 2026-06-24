import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generates a Purchase Request PDF matching the official LGU template:
 * - LGU / Fund / Department / PR No. / Date / Section / FPP header block
 * - Item No. | Unit | Item Description | Quantity | Unit Cost | Total Cost table
 * - Requested by / Cash Availability / Approved by signatory footer
 *
 * @param {object} pr - purchase_requests row
 * @param {array} items - pr_items_live rows (already has live Inventory pricing)
 * @param {object} signatories - { municipal_mayor, general_services_officer, municipal_treasurer }
 */
export function generatePurchaseRequestPDF(pr, items, signatories = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  let y = 50

  // ---- Header ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PURCHASE REQUEST', pageWidth / 2, y, { align: 'center' })
  y += 26

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const leftX = margin
  const rightX = pageWidth / 2 + 20

  doc.text(`LGU: Municipality of Alaminos`, leftX, y)
  doc.text(`Fund: ${pr.fund || 'General Fund'}`, rightX, y)
  y += 16
  doc.text(`Department: ${pr.department || ''}`, leftX, y)
  doc.text(`PR No.: ${pr.pr_number || ''}`, rightX, y)
  y += 16
  doc.text(`Section: ____________`, leftX, y)
  doc.text(`Date: ${pr.pr_date ? new Date(pr.pr_date).toLocaleDateString() : ''}`, rightX, y)
  y += 16
  doc.text(`FPP: __________________`, leftX, y)
  doc.text(`Requester: ${pr.requester_name || ''}`, rightX, y)
  y += 20

  // ---- Items table ----
  const rows = items.map((it, idx) => [
    String(idx + 1),
    it.unit || '',
    it.item_description || '',
    String(it.quantity),
    Number(it.unit_cost).toFixed(2),
    Number(it.total_cost ?? it.quantity * it.unit_cost).toFixed(2),
  ])

  const grandTotal = items.reduce((sum, it) => sum + Number(it.total_cost ?? it.quantity * it.unit_cost), 0)

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item No.', 'Unit', 'Item Description', 'Quantity', 'Unit Cost', 'Total Cost']],
    body: rows,
    foot: [['', '', '', '', 'GRAND TOTAL', grandTotal.toFixed(2)]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 65, halign: 'right' },
      5: { cellWidth: 65, halign: 'right' },
    },
  })

  let finalY = doc.lastAutoTable.finalY + 20

  // ---- Purpose ----
  doc.setFontSize(10)
  doc.text(`Purpose: ${pr.purpose || '—'}`, margin, finalY, { maxWidth: pageWidth - margin * 2 })
  finalY += 40

  // ---- Signatory block (Requested by / Cash Availability / Approved by) ----
  const colWidth = (pageWidth - margin * 2) / 3
  const col1 = margin
  const col2 = margin + colWidth
  const col3 = margin + colWidth * 2

  doc.setFont('helvetica', 'bold')
  doc.text('Requested by:', col1, finalY)
  doc.text('Cash Availability:', col2, finalY)
  doc.text('Approved by:', col3, finalY)
  finalY += 30

  doc.setFont('helvetica', 'normal')
  doc.text('_______________________', col1, finalY)
  doc.text('_______________________', col2, finalY)
  doc.text('_______________________', col3, finalY)
  finalY += 16

  doc.setFont('helvetica', 'bold')
  doc.text(signatories.general_services_officer || '', col1, finalY)
  doc.text(signatories.municipal_treasurer || '', col2, finalY)
  doc.text(signatories.municipal_mayor || '', col3, finalY)
  finalY += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('General Services Officer', col1, finalY)
  doc.text('Municipal Treasurer', col2, finalY)
  doc.text('Municipal Mayor', col3, finalY)

  doc.save(`${pr.pr_number || 'Purchase-Request'}.pdf`)
}
