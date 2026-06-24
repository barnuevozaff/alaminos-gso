import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ItemAutocomplete({ onSelect, excludeIds = [], placeholder = 'Type item name or code to search inventory…' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const value = e.target.value
    setQuery(value)
    setHighlightIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('inventory')
        .select('id, item_code, item_name, unit, quantity, unit_cost')
        .or(`item_name.ilike.%${value}%,item_code.ilike.%${value}%`)
        .gt('quantity', 0)
        .order('item_name')
        .limit(8)
      setResults((data || []).filter((i) => !excludeIds.includes(i.id)))
      setOpen(true)
      setLoading(false)
    }, 300)
  }

  function selectItem(item) {
    onSelect(item)
    setQuery('')
    setResults([])
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
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0) selectItem(results[highlightIndex])
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
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length) setOpen(true) }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          marginTop: 4, maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}>
          {loading ? (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>No matching items in inventory.</div>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setHighlightIndex(idx)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                  background: idx === highlightIndex ? '#fbf2ef' : 'transparent',
                  borderBottom: idx < results.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', gap: 10,
                }}
              >
                <span><strong>{item.item_name}</strong> <span className="text-muted">({item.item_code})</span></span>
                <span className="text-muted">{item.unit} · available {item.quantity}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
