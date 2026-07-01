import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Settings() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(null) // 'sig' | 'account' | null

  // PDF Signatories
  const [mayor, setMayor] = useState('')
  const [gso, setGso] = useState('')
  const [treasurer, setTreasurer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sigError, setSigError] = useState('')
  const [sigSaved, setSigSaved] = useState(false)

  // Account Name
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  // Change Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => { loadSig() }, [])
  useEffect(() => { if (profile) setDisplayName(profile.full_name || '') }, [profile])

  function toggle(key) {
    setOpen((prev) => (prev === key ? null : key))
  }

  async function loadSig() {
    setLoading(true)
    const { data } = await supabase.from('pdf_signatories').select('*').eq('id', 1).maybeSingle()
    if (data) {
      setMayor(data.municipal_mayor || '')
      setGso(data.general_services_officer || '')
      setTreasurer(data.municipal_treasurer || '')
    }
    setLoading(false)
  }

  async function handleSaveSig() {
    setSaving(true); setSigError(''); setSigSaved(false)
    const { error } = await supabase.from('pdf_signatories').upsert({
      id: 1,
      municipal_mayor: mayor || null,
      general_services_officer: gso || null,
      municipal_treasurer: treasurer || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setSigError(error.message); return }
    setSigSaved(true)
    setTimeout(() => setSigSaved(false), 3000)
  }

  async function handleSaveName() {
    if (!displayName.trim()) { setNameError('Name cannot be blank.'); return }
    setSavingName(true); setNameError(''); setNameSaved(false)
    const { error } = await supabase.from('profiles').update({ full_name: displayName.trim() }).eq('id', profile.id)
    setSavingName(false)
    if (error) { setNameError(error.message); return }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 3000)
  }

  async function handleChangePassword() {
    if (!newPassword) { setPwError('Enter a new password.'); return }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setSavingPw(true); setPwError(''); setPwSaved(false)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading settings…</div></Layout>

  const tileBase = {
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
    background: 'var(--card-bg)',
  }

  return (
    <Layout>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Choose a section to configure.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── CARD 1: PDF Signatories ── */}
        <div style={tileBase}>
          {/* Clickable header tile */}
          <button
            onClick={() => toggle('sig')}
            style={{
              width: '100%', border: 'none', cursor: 'pointer',
              background: open === 'sig' ? 'var(--maroon)' : 'linear-gradient(135deg, #7a1e2a 0%, #a8293a 100%)',
              padding: '28px 28px',
              display: 'flex', alignItems: 'center', gap: 18,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>✍️</div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>PDF Signatories</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                Configure names printed on Purchase Request PDFs
              </div>
            </div>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', transform: open === 'sig' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              ▾
            </div>
          </button>

          {/* Expandable form */}
          {open === 'sig' && (
            <div style={{ padding: 28, borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>
                Leave a field blank to omit that signature line from the PDF.
              </p>
              {sigError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{sigError}</div>}
              {sigSaved && <div className="alert alert-success" style={{ marginBottom: 14 }}>Signatories saved successfully.</div>}
              <div className="form-group">
                <label className="form-label">🏛 Municipal Mayor</label>
                <input className="form-input" value={mayor} onChange={(e) => setMayor(e.target.value)} placeholder="e.g. Hon. ERICSON R. LOPEZ" />
              </div>
              <div className="form-group">
                <label className="form-label">🗂 General Services Officer</label>
                <input className="form-input" value={gso} onChange={(e) => setGso(e.target.value)} placeholder="e.g. FLORENTINO J. DESTACAMENTO" />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label">💰 Municipal Treasurer</label>
                <input className="form-input" value={treasurer} onChange={(e) => setTreasurer(e.target.value)} placeholder="e.g. ROWENA C. LANDICHO" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={saving} onClick={handleSaveSig}>
                {saving ? 'Saving…' : 'Save Signatories'}
              </button>
            </div>
          )}
        </div>

        {/* ── CARD 2: Account Settings ── */}
        <div style={tileBase}>
          {/* Clickable header tile */}
          <button
            onClick={() => toggle('account')}
            style={{
              width: '100%', border: 'none', cursor: 'pointer',
              background: open === 'account' ? '#1a4a7a' : 'linear-gradient(135deg, #1a4a7a 0%, #2a6aaa 100%)',
              padding: '28px 28px',
              display: 'flex', alignItems: 'center', gap: 18,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>👤</div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Account Settings</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                Update your display name and password
              </div>
            </div>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', transform: open === 'account' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              ▾
            </div>
          </button>

          {/* Expandable form */}
          {open === 'account' && (
            <div style={{ padding: 28, borderTop: '1px solid var(--border)' }}>

              {/* Display Name */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>🪪</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Display Name</span>
                </div>
                {nameError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{nameError}</div>}
                {nameSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Name updated successfully.</div>}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingName} onClick={handleSaveName}>
                  {savingName ? 'Saving…' : 'Update Name'}
                </button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 28px' }} />

              {/* Change Password */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Change Password</span>
                </div>
                {pwError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pwError}</div>}
                {pwSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Password changed successfully.</div>}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingPw} onClick={handleChangePassword}>
                  {savingPw ? 'Changing…' : 'Change Password'}
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
