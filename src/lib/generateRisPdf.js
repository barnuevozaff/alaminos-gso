import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import sealLogo from '../assets/alaminos-seal.jpeg'

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
 * Generates a Requisition and Issue Slip PDF matching the official
 * Appendix 48 LGU template:
 * - LGU / Fund / Division / FPP Code / Office / RIS No. / Date header block
 * - Requisition (Stock No. | Unit | Description | Quantity) and
 *   Issuance (Quantity | Remarks) table
 * - Purpose line
 * - Requested by / Approved by / Issued by / Received by signatory block
 *   (left blank for physical signing — no printed names or lines)
 *
 * @param {object} ris - requisition_issue_slips row
 * @param {array} items - ris_items rows
 */
export async function generateRequisitionIssueSlipPDF(ris, items) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  let y = 40

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text('Appendix 48', pageWidth - margin, y, { align: 'right' })
  y += 20

  // ---- Header ----
  try {
    const logoDataUrl = await loadImageAsDataURL(sealLogo)
    doc.addImage(logoDataUrl, 'JPEG', pageWidth / 2 - 24, y - 18, 48, 48)
    y += 40
  } catch {
    // if the logo fails to load, continue without it rather than failing the whole PDF
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('REQUISITION AND ISSUE SLIP', pageWidth / 2, y, { align: 'center' })
  y += 26

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const leftX = margin
  const rightX = pageWidth / 2 + 20

  doc.text(`LGU: Municipality of Alaminos`, leftX, y)
  doc.text(`Fund: ${ris.fund || ''}`, rightX, y)
  y += 16
  doc.text(`Division: ${ris.division || ''}`, leftX, y)
  doc.text(`FPP Code: ${ris.fpp_code || ''}`, rightX, y)
  y += 16
  doc.text(`Office: ${ris.office || ''}`, leftX, y)
  doc.text(`RIS No.: ${ris.ris_number || ''}`, rightX, y)
  y += 16
  doc.text(`Date: ${ris.ris_date ? new Date(ris.ris_date).toLocaleDateString() : ''}`, rightX, y)
  y += 20

  // ---- Requisition / Issuance table (padded with blank rows) ----
  const paddedItems = [...items]
  while (paddedItems.length < 12) paddedItems.push(null)

  const rows = paddedItems.map((it) => [
    it?.stock_no || '',
    it?.unit || '',
    it?.description || '',
    it ? String(it.quantity) : '',
    it?.issued_quantity != null ? String(it.issued_quantity) : '',
    it?.remarks || '',
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: 'Requisition', colSpan: 4, styles: { halign: 'center' } },
        { content: 'Issuance', colSpan: 2, styles: { halign: 'center' } },
      ],
      ['Stock No.', 'Unit', 'Description', 'Quantity', 'Quantity', 'Remarks'],
    ],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 50 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 90 },
    },
  })

  let finalY = doc.lastAutoTable.finalY + 20

  doc.setFont('helvetica', 'bold')
  doc.text('Purpose:', leftX, finalY)
  doc.setFont('helvetica', 'normal')
  doc.text(ris.purpose || '', leftX + 55, finalY, { maxWidth: pageWidth - margin * 2 - 55 })
  finalY += 40

  // ---- Signatory block (Requested by / Approved by / Issued by / Received by) ----
  // Left blank on purpose — signed and printed-named by hand on the physical copy.
  const colWidth = (pageWidth - margin * 2) / 4
  const cols = [margin, margin + colWidth, margin + colWidth * 2, margin + colWidth * 3]
  const labels = ['Requested by:', 'Approved by:', 'Issued by:', 'Received by:']

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  labels.forEach((label, i) => doc.text(label, cols[i], finalY))
  finalY += 50

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  cols.forEach((x) => doc.text('Signature over Printed Name', x, finalY))

  doc.save(`${ris.ris_number || 'Requisition-and-Issue-Slip'}.pdf`)
}
