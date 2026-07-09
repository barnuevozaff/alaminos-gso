import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  )
}

const TOAST_STYLES = {
  success: { background: '#1f8a3a', icon: '✓' },
  error:   { background: '#c0312b', icon: '✕' },
  info:    { background: '#1a4a7a', icon: 'ℹ' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const s = TOAST_STYLES[t.type] || TOAST_STYLES.info
        return (
          <div
            key={t.id}
            style={{
              background: s.background,
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontWeight: 500,
              minWidth: 240, maxWidth: 380,
              pointerEvents: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => onDismiss(t.id)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}
