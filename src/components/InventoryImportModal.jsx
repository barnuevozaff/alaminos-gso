import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faFileArrowUp, faXmark, faPlus, faSpinner, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { UNITS } from '../lib/units'

// ── Known unit keywords ───────────────────────────────────
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
]

const UNIT_PATTERN = new RegExp(`\\b(${UNIT_WORDS.join('|')})s?\\b`, 'i')

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

// ── Category keyword map ──────────────────────────────────
const CATEGORY_KEYWORDS = {
  'cleaning': ['cleaning', 'soap', 'bleach', 'disinfect', 'broom', 'mop', 'detergent', 'wipes', 'alcohol', 'sanitizer', 'trash', 'garbage', 'dust', 'floor', 'polish'],
  'it':       ['computer', 'laptop', 'printer', 'ink', 'cartridge', 'toner', 'usb', 'cable', 'monitor', 'keyboard', 'mouse', 'router', 'battery', 'charger', 'scanner', 'tablet', 'hard', 'drive', 'flash', 'webcam', 'projector'],
  'office':   ['paper', 'bond', 'folder', 'staple', 'pencil', 'pen', 'ballpen', 'marker', 'highlighter', 'tape', 'clip', 'binder', 'envelope', 'notebook', 'pad', 'eraser', 'ruler', 'record', 'board', 'stamp', 'ribbon', 'correction', 'scissors', 'glue'],
}

function guessCategory(itemName, categories) {
  if (!categories?.length) return ''
  const lower = itemName.toLowerCase()

  // 1. Direct word-overlap against existing category names
  for (const cat of categories) {
    const words = cat.name.toLowerCase().split(/\s+/)
    if (words.some((w) => w.length > 3 && lower.includes(w))) return cat.name
  }

  // 2. Keyword-map fallback
  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const match = categories.find((c) => c.name.toLowerCase().includes(key))
      if (match) return match.name
    }
  }

  return ''
}

// ── Text parser — detects section headers as categories ───
function parseInventoryText(raw) {
  const items = []
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 2)
  let currentCategory = ''

  for (const line of lines) {
    // Detect section header: ALL CAPS line, no price/qty pattern, short-ish
    const isHeader =
      /^[A-Z][A-Z\s&\/\-,()]+:?\s*$/.test(line) &&
      line.length >= 4 &&
      line.length <= 60 &&
      !/\d/.test(line)
    if (isHeader) {
      currentCategory = line.replace(/:$/, '').trim()
      continue
    }

    // Skip obvious table headers/footers
    if (/^(item\s*(?:description|name)?|description|qty|quantity|unit\s*cost|amount|total\s*(?:cost|amount)?|no\.?|sl\.?\s*no|#|price|cost|unit)\s*$/i.test(line)) continue
    if (/^\d{1,2}$/.test(line)) continue
    if (/^[-=_]{3,}$/.test(line)) continue

    // Extract price
    const priceMatch =
      line.match(/[₱P]\s*([\d,]+(?:\.\d+)?)/) ||
      line.match(/\b([\d,]+\.\d{2})\s*$/) ||
      line.match(/\b([\d,]+)\s*$/)
    const unit_cost = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

    // Extract unit
    const unitMatch = line.match(UNIT_PATTERN)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'piece'

    // Extract quantity
    const qtyBeforeUnit = new RegExp(`(\\d+)\\s*(?:${UNIT_WORDS.join('|')})s?\\b`, 'i').exec(line)
    const qtyStandalone = !qtyBeforeUnit && /\b(\d{1,4})\b/.exec(line)
    let quantity = 1
    if (qtyBeforeUnit) quantity = parseInt(qtyBeforeUnit[1])
    else if (qtyStandalone) quantity = parseInt(qtyStandalone[1])

    // Clean item name
    let name = line
      .replace(/[₱P]\s*[\d,]+(?:\.\d+)?/g, '')
      .replace(new RegExp(`\\b\\d+\\s*(?:${UNIT_WORDS.join('|')})s?\\b`, 'gi'), '')
      .replace(/\b[\d,]+\.\d{2}\b/g, '')
      .replace(/[-–]\s*\d+\s+/g, '')
      .replace(/\|\s*[\d.]+\s*\|?/g, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (name.length < 2 || /^[\W\d]+$/.test(name)) continue

    items.push({ name, unit, quantity, unit_cost, categoryName: currentCategory })
  }

  return items
}

// ── Duplicate finder ──────────────────────────────────────
function findDuplicate(name, existingItems) {
  const lower = name.toLowerCase().trim()
  return existingItems?.find((item) => {
    const ex = item.item_name.toLowerCase().trim()
    return ex === lower || ex.includes(lower) || lower.includes(ex)
  }) || null
}

// ── Component ──────────────────────────────────────────────
export default function InventoryImportModal({ categories, existingItems = [], onClose, onSaved }) {
  const [step, setStep] = useState('upload')   // 'upload' | 'processing' | 'confirm'
  const [rows, setRows] = useState([])
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
        setError('No items could be extracted. Try a clearer image or a typed/digital PDF.')
        setStep('upload')
        return
      }
      const withCats = parsed
        .map((item) => {
          const dup = findDuplicate(item.name, existingItems)
          return {
            ...item,
            categoryName: item.categoryName || guessCategory(item.name, categories),
            mode: dup ? 'update' : 'add',
            existingId: dup?.id || null,
            existingQty: dup?.quantity || 0,
            existingName: dup?.item_name || null,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
      setRows(withCats)
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
    setRows((prev) => [...prev, { name: '', unit: 'piece', quantity: 1, unit_cost: 0, categoryName: '' }])
  }

  async function handleSave() {
    const blank = rows.find((r) => !r.name.trim())
    if (blank) { setError('All items must have a name.'); return }

    setSaving(true)
    setError('')

    // Ensure "Others" category exists as fallback for items with no category
    let othersId = categories.find((c) => c.name.toLowerCase() === 'others')?.id || null
    if (!othersId) {
      const { data } = await supabase.from('categories').insert({ name: 'Others' }).select('id').single()
      if (data) othersId = data.id
    }

    // Find unique new category names (not in existing categories)
    const uniqueNewNames = [...new Set(
      rows
        .map((r) => r.categoryName.trim())
        .filter((n) => n && !categories.find((c) => c.name.toLowerCase() === n.toLowerCase()))
    )]

    // Auto-create new categories
    const newCatMap = {} // lowercaseName → id
    for (const name of uniqueNewNames) {
      const { data } = await supabase.from('categories').insert({ name }).select('id').single()
      if (data) newCatMap[name.toLowerCase()] = data.id
    }

    // Resolve category ID helper
    const resolveCatId = (catName) => {
      const trimmed = catName.trim()
      if (!trimmed) return othersId
      const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
      return existing ? existing.id : (newCatMap[trimmed.toLowerCase()] || othersId)
    }

    // Split rows into inserts and updates
    const toInsert = rows.filter((r) => r.mode === 'add')
    const toUpdate = rows.filter((r) => r.mode === 'update' && r.existingId)

    // Handle stock updates (add qty to existing)
    for (const r of toUpdate) {
      const newQty = Number(r.existingQty) + Number(r.quantity)
      await supabase.from('inventory').update({ quantity: newQty }).eq('id', r.existingId)
    }

    // Build final rows with resolved category IDs (fallback to Others if blank)
    const itemsToInsert = toInsert.map((r) => {
      const catId = resolveCatId(r.categoryName)
      return {
        item_name: r.name.trim(),
        category_id: catId,
        unit: r.unit,
        quantity: Number(r.quantity) || 0,
        unit_cost: Number(r.unit_cost) || 0,
        reorder_level: 10,
      }
    })

    if (itemsToInsert.length > 0) {
      const { error: insErr } = await supabase.from('inventory').insert(itemsToInsert)
      if (insErr) { setSaving(false); setError(insErr.message); return }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 860, maxHeight: '92vh', overflowY: 'auto' }}
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
              Take a photo or upload a PDF / image of your inventory list.
              The system will automatically extract the items — you can correct any errors before saving.
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
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Use Camera</div>
                  <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Take a photo of the list</div>
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
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Upload File</div>
                  <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>PDF or image (JPG, PNG)</div>
                </div>
              </button>
            </div>
            <p className="form-hint" style={{ textAlign: 'center' }}>
              For best results: use a clear, columnar list (typed or printed, not handwritten).
            </p>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
          </>
        )}

        {/* STEP 2: Processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 48, color: 'var(--maroon)', marginBottom: 20 }} />
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{progressLabel}</div>
            <div className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>Do not close this window…</div>
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
            {/* datalist for category autocomplete — shared by all rows */}
            <datalist id="cat-list">
              {categories.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>

            {(() => {
              const newCount = rows.filter((r) => r.mode === 'add').length
              const updateCount = rows.filter((r) => r.mode === 'update').length
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(31,138,58,0.08)', border: '1px solid rgba(31,138,58,0.25)', borderRadius: 10, marginBottom: 16 }}>
                  <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--green)', fontSize: 18 }} />
                  <span style={{ fontSize: 13 }}>
                    Extracted <strong>{rows.length} item{rows.length !== 1 ? 's' : ''}</strong>
                    {updateCount > 0 && <> — <strong style={{ color: '#b45309' }}>{updateCount} duplicate{updateCount > 1 ? 's' : ''} detected</strong> (will update stock)</>}
                    {newCount > 0 && <>, <strong>{newCount} new</strong></>}.
                    {' '}Review before saving.
                  </span>
                </div>
              )
            })()}

            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 190 }}>Item Name</th>
                    <th style={{ minWidth: 160 }}>Category</th>
                    <th style={{ minWidth: 110 }}>Unit</th>
                    <th style={{ minWidth: 75 }}>Qty</th>
                    <th style={{ minWidth: 120 }}>Unit Cost (₱)</th>
                    <th style={{ minWidth: 130 }}>Action</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} style={r.mode === 'update' ? { background: 'rgba(180,83,9,0.06)' } : undefined}>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: '100%', minWidth: 170 }}
                          value={r.name}
                          onChange={(e) => updateRow(idx, 'name', e.target.value)}
                        />
                        {r.mode === 'update' && (
                          <div style={{ fontSize: 11, color: '#b45309', marginTop: 3 }}>
                            Matches: "{r.existingName}" (current qty: {r.existingQty})
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          list="cat-list"
                          className="form-input"
                          style={{ width: '100%', minWidth: 140 }}
                          placeholder="Type or select…"
                          value={r.categoryName}
                          onChange={(e) => updateRow(idx, 'categoryName', e.target.value)}
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
                        {r.mode === 'update' && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            +{r.quantity} → {Number(r.existingQty) + Number(r.quantity)}
                          </div>
                        )}
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
                        {r.mode === 'update' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: 'rgba(180,83,9,0.12)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                              Update Stock
                            </span>
                            <button
                              style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline' }}
                              onClick={() => updateRow(idx, 'mode', 'add')}
                            >
                              Add as new instead
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'rgba(31,138,58,0.1)', borderRadius: 4, padding: '2px 6px' }}>
                            New Item
                          </span>
                        )}
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
