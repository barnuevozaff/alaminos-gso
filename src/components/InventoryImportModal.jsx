import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faFileArrowUp, faXmark, faPlus, faSpinner, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { UNITS } from '../lib/units'

// ── Known unit keywords for parser ────────────────────────
const UNIT_WORDS = [
  'piece', 'pieces', 'pcs', 'pc',
  'box', 'boxes',
  'ream', 'reams',
  'set', 'sets',
  'roll', 'rolls',
  'bottle', 'bottles',
  'pack', 'packs', 'packet', 'packets',
  'pair', 'pairs',
  'unit', 'units',
  'bag', 'bags',
  'sheet', 'sheets',
  'gallon', 'gallons',
  'liter', 'liters', 'litre', 'litres',
  'meter', 'meters', 'metre', 'metres',
  'lot', 'lots',
  'can', 'cans',
  'tube', 'tubes',
  'jar', 'jars',
  'pad', 'pads',
  'tablet', 'tablets',
  'bundle', 'bundles',
  'ream',
]

// ── OCR helpers ───────────────────────────────────────────
async function runOCR(fileOrBlob, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100))
    },
  })
  const { data: { text } } = await worker.recognize(fileOrBlob)
  await worker.terminate()
  return text
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  let text = ''
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((s) => s.str).join(' ') + '\n'
  }
  return text
}

async function pdfToImageBlob(file) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const page = await pdf.getPage(1)
  const vp = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = vp.width
  canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
  return new Promise((res) => canvas.toBlob(res, 'image/png'))
}

// ── Text parser ────────────────────────────────────────────
const UNIT_PATTERN = new RegExp(`\\b(${UNIT_WORDS.join('|')})s?\\b`, 'i')

function parseInventoryText(raw) {
  const items = []
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 2)

  for (const line of lines) {
    // Skip obvious headers/footers
    if (/^(item\s*(?:description|name)?|description|qty|quantity|unit\s*cost|amount|total|no\.?|sl\.?\s*no|#|price|cost)\b/i.test(line)) continue
    if (/^\d{1,2}$/.test(line)) continue
    if (/^[-=_]{3,}$/.test(line)) continue

    // Extract price (₱ or number with 2 decimals or large number at end)
    const priceMatch =
      line.match(/[₱P]\s*([\d,]+(?:\.\d+)?)/) ||
      line.match(/\b([\d,]+\.\d{2})\s*$/) ||
      line.match(/\b([\d,]+)\s*$/)
    const unit_cost = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

    // Extract unit
    const unitMatch = line.match(UNIT_PATTERN)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'piece'

    // Extract quantity — number right before a known unit, or standalone small number
    const qtyBeforeUnit = new RegExp(`(\\d+)\\s*(?:${UNIT_WORDS.join('|')})s?\\b`, 'i').exec(line)
    const qtyStandalone = !qtyBeforeUnit && /\b(\d{1,4})\b/.exec(line)
    let quantity = 1
    if (qtyBeforeUnit) quantity = parseInt(qtyBeforeUnit[1])
    else if (qtyStandalone) quantity = parseInt(qtyStandalone[1])

    // Clean item name
    let name = line
      .replace(/[₱P]\s*[\d,]+(?:\.\d+)?/g, '')                          // prices with ₱
      .replace(new RegExp(`\\b\\d+\\s*(?:${UNIT_WORDS.join('|')})s?\\b`, 'gi'), '') // qty+unit
      .replace(/\b[\d,]+\.\d{2}\b/g, '')                                 // bare decimals
      .replace(/[-–]\s*\d+\s+/g, '')
      .replace(/\|\s*[\d.]+\s*\|?/g, '')
      .replace(/^\d+[\.\)]\s*/, '')                                       // list numbers
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (name.length < 2 || /^[\W\d]+$/.test(name)) continue

    items.push({ name, unit, quantity, unit_cost })
  }

  return items
}

// ── Component ──────────────────────────────────────────────
export default function InventoryImportModal({ categories, onClose, onSaved }) {
  const [step, setStep] = useState('upload')   // 'upload' | 'processing' | 'confirm'
  const [rows, setRows] = useState([])
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  async function handleFile(file) {
    if (!file) return
    setStep('processing')
    setProgress(0)
    setError('')

    try {
      let text = ''

      if (file.type === 'application/pdf') {
        setProgressLabel('Reading PDF…')
        text = await extractPdfText(file)
        if (text.replace(/\s/g, '').length < 30) {
          setProgressLabel('Scanned PDF detected — running OCR…')
          const img = await pdfToImageBlob(file)
          text = await runOCR(img, (p) => {
            setProgress(p)
            setProgressLabel(`OCR: ${p}%`)
          })
        } else {
          setProgress(100)
          setProgressLabel('Done')
        }
      } else {
        setProgressLabel('Running OCR on image…')
        text = await runOCR(file, (p) => {
          setProgress(p)
          setProgressLabel(`OCR: ${p}%`)
        })
      }

      const parsed = parseInventoryText(text)
      if (parsed.length === 0) {
        setError('Walang na-extract na items. Try a clearer image or a typed/digital PDF.')
        setStep('upload')
        return
      }
      setRows(parsed)
      setStep('confirm')
    } catch (e) {
      setError(e.message || 'Processing failed.')
      setStep('upload')
    }
  }

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function deleteRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', unit: 'piece', quantity: 1, unit_cost: 0 }])
  }

  async function handleSave() {
    if (!categoryId) { setError('Pumili ng category.'); return }
    const blank = rows.find((r) => !r.name.trim())
    if (blank) { setError('Lahat ng items ay kailangan ng pangalan.'); return }
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('inventory').insert(
      rows.map((r) => ({
        item_name: r.name.trim(),
        category_id: categoryId,
        unit: r.unit,
        quantity: Number(r.quantity) || 0,
        unit_cost: Number(r.unit_cost) || 0,
        reorder_level: 10,
      }))
    )
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">
          {step === 'upload' && 'Import Items from File / Camera'}
          {step === 'processing' && 'Processing File…'}
          {step === 'confirm' && 'Review & Confirm Items'}
        </h3>

        {error && <div className="alert alert-error">{error}</div>}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <>
            <p className="text-muted" style={{ marginBottom: 24, lineHeight: 1.6 }}>
              I-capture ang larawan ng inventory list o mag-upload ng PDF / image file.
              Awtomatiko itong magba-extract ng items — pwede mo pang baguhin bago i-save.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
              <button
                style={{
                  border: '2px dashed var(--border)', borderRadius: 16, background: 'var(--bg)',
                  cursor: 'pointer', padding: '36px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--maroon)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => cameraRef.current.click()}
              >
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(122,30,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesomeIcon icon={faCamera} style={{ fontSize: 32, color: 'var(--maroon)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Gamitin ang Camera</div>
                  <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>I-photo ang inventory list</div>
                </div>
              </button>
              <button
                style={{
                  border: '2px dashed var(--border)', borderRadius: 16, background: 'var(--bg)',
                  cursor: 'pointer', padding: '36px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1a4a7a'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => fileRef.current.click()}
              >
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(26,74,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesomeIcon icon={faFileArrowUp} style={{ fontSize: 32, color: '#1a4a7a' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Mag-upload ng File</div>
                  <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>PDF o image (JPG, PNG)</div>
                </div>
              </button>
            </div>
            <p className="form-hint" style={{ textAlign: 'center' }}>
              Para sa mas magandang resulta: gumamit ng maliwanag, nakakolumna na listahan (typed, hindi handwritten).
            </p>
            {/* hidden inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
          </>
        )}

        {/* STEP 2: Processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 48, color: 'var(--maroon)', marginBottom: 20 }} />
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{progressLabel}</div>
            <div className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>Huwag isara ang window…</div>
            {progress > 0 && (
              <>
                <div style={{ background: 'var(--border)', borderRadius: 99, height: 10, maxWidth: 320, margin: '0 auto' }}>
                  <div style={{ height: 10, borderRadius: 99, background: 'var(--maroon)', width: `${progress}%`, transition: 'width 0.25s' }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{progress}%</div>
              </>
            )}
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(31,138,58,0.08)', border: '1px solid rgba(31,138,58,0.25)', borderRadius: 10, marginBottom: 16 }}>
              <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--green)', fontSize: 18 }} />
              <span style={{ fontSize: 13 }}>
                Na-extract ang <strong>{rows.length} item{rows.length !== 1 ? 's' : ''}</strong>.
                I-review at i-correct ang mga mali bago i-save.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Category (para sa lahat ng items)</label>
              <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— Pumili ng category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Item Name</th>
                    <th style={{ minWidth: 110 }}>Unit</th>
                    <th style={{ minWidth: 80 }}>Qty</th>
                    <th style={{ minWidth: 120 }}>Unit Cost (₱)</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: '100%', minWidth: 180 }}
                          value={r.name}
                          onChange={(e) => updateRow(idx, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={r.unit}
                          onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 70 }}
                          min="0"
                          value={r.quantity}
                          onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 110 }}
                          min="0"
                          step="0.01"
                          value={r.unit_cost}
                          onChange={(e) => updateRow(idx, 'unit_cost', e.target.value)}
                        />
                      </td>
                      <td>
                        <button className="icon-btn danger" title="Remove row" onClick={() => deleteRow(idx)}>
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginBottom: 24 }}>
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Add Row
            </button>

            <div className="print-actions">
              <button className="btn btn-secondary" onClick={() => { setStep('upload'); setRows([]) }}>
                ← Re-scan
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || rows.length === 0}>
                {saving ? 'Saving…' : `Add ${rows.length} Item${rows.length !== 1 ? 's' : ''} to Inventory`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
