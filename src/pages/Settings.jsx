import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilePdf, faUser, faLock, faLandmark, faBriefcase, faCoins, faIdCard, faXmark } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function Modal({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)', borderRadius: 20, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden', animation: 'modalPop 0.18s ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SettingTile({ icon, title, description, color, iconColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '52px 32px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, textAlign: 'center', width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        minHeight: 280,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div style={{
        width: 88, height: 88, borderRadius: 24,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 38, color: iconColor }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 220, margin: '0 auto' }}>{description}</div>
      </div>
    </button>
  )
}

export default function Settings() {
  const { profile } = useAuth()
  const [modal, setModal] = useState(null) // 'sig' | 'account'

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

  return (
    <Layout>
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Select a section to configure.</p>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SettingTile
          icon={faFilePdf}
          title="PDF Signatories"
          description="Names printed on generated Purchase Request PDFs"
          color="rgba(122,30,42,0.12)"
          iconColor="var(--maroon)"
          onClick={() => setModal('sig')}
        />
        <SettingTile
          icon={faUser}
          title="Account Settings"
          description="Change your display name or login password"
          color="rgba(26,74,122,0.12)"
          iconColor="#1a4a7a"
          onClick={() => setModal('account')}
        />
      </div>

      {/* ── Modal: PDF Signatories ── */}
      {modal === 'sig' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ background: 'var(--maroon)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✍️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>PDF Signatories</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Names on generated Purchase Request PDFs</div>
            </div>
            <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          <div style={{ padding: 28 }}>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>Leave a field blank to omit that signature line from the PDF.</p>
            {sigError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{sigError}</div>}
            {sigSaved && <div className="alert alert-success" style={{ marginBottom: 14 }}>Signatories saved successfully.</div>}
            <div className="form-group">
              <label className="form-label"><FontAwesomeIcon icon={faLandmark} style={{ marginRight: 6, color: 'var(--text-muted)' }} />Municipal Mayor</label>
              <input className="form-input" value={mayor} onChange={(e) => setMayor(e.target.value)} placeholder="e.g. Hon. ERICSON R. LOPEZ" />
            </div>
            <div className="form-group">
              <label className="form-label"><FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 6, color: 'var(--text-muted)' }} />General Services Officer</label>
              <input className="form-input" value={gso} onChange={(e) => setGso(e.target.value)} placeholder="e.g. FLORENTINO J. DESTACAMENTO" />
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label"><FontAwesomeIcon icon={faCoins} style={{ marginRight: 6, color: 'var(--text-muted)' }} />Municipal Treasurer</label>
              <input className="form-input" value={treasurer} onChange={(e) => setTreasurer(e.target.value)} placeholder="e.g. ROWENA C. LANDICHO" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={saving} onClick={handleSaveSig}>
              {saving ? 'Saving…' : 'Save Signatories'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Account Settings ── */}
      {modal === 'account' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ background: '#1a4a7a', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Account Settings</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Display name and password</div>
            </div>
            <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          <div style={{ padding: 28 }}>
            {/* Display Name */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <FontAwesomeIcon icon={faIdCard} style={{ color: '#1a4a7a' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Display Name</span>
              </div>
              {nameError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{nameError}</div>}
              {nameSaved && <div className="alert alert-success" style={{ marginBottom: 10 }}>Name updated successfully.</div>}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingName} onClick={handleSaveName}>
                {savingName ? 'Saving…' : 'Update Name'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', marginBottom: 26 }} />

            {/* Change Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <FontAwesomeIcon icon={faLock} style={{ color: '#1a4a7a' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Change Password</span>
              </div>
              {pwError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{pwError}</div>}
              {pwSaved && <div className="alert alert-success" style={{ marginBottom: 10 }}>Password changed successfully.</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingPw} onClick={handleChangePassword}>
                {savingPw ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
