import { useEffect, useRef, useState } from 'react'
import { DEPARTMENTS } from '../lib/departments'

export default function DepartmentAutocomplete({ value, onChange, disabled, placeholder = 'Type or select a department…' }) {
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const results = value.trim()
    ? DEPARTMENTS.filter((d) => d.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 8)
    : []

  function selectItem(dept) {
    onChange(dept)
    setOpen(false)
    setHighlightIndex(-1)
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectItem(results[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setHighlightIndex(-1); setOpen(true) }}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length) setOpen(true) }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          marginTop: 4, maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}>
          {results.map((dept, idx) => (
            <div
              key={dept}
              onClick={() => selectItem(dept)}
              onMouseEnter={() => setHighlightIndex(idx)}
              style={{
                padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                background: idx === highlightIndex ? '#fbf2ef' : 'transparent',
                borderBottom: idx < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {dept}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
