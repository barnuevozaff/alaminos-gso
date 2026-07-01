import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilePdf, faUser, faLock, faLandmark, faBriefcase, faCoins, faIdCard, faXmark, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
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
  const [modal, setModal] = useState(null) // 'sig' | 'account' | 'mfa'

  // MFA
  const [mfaFactor, setMfaFactor] = useState(null) // enrolled TOTP factor or null
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaEnrollData, setMfaEnrollData] = useState(null) // { id, totp: { qr_code, secret } }
  const [mfaEnrollStep, setMfaEnrollStep] = useState('idle') // 'idle' | 'scan' | 'done'
  const [mfaOtp, setMfaOtp] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')

  async function openMfa() {
    setMfaError(''); setMfaSuccess(''); setMfaEnrollStep('idle'); setMfaOtp(''); setMfaEnrollData(null)
    setMfaLoading(true)
    const { data: factors } = await supabase.auth.mfa.listFactors()
    setMfaFactor(factors?.totp?.[0] || null)
    setMfaLoading(false)
    setModal('mfa')
  }

  async function handleMfaEnroll() {
    setMfaError('')
    setMfaLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setMfaLoading(false)
    if (error) { setMfaError(error.message); return }
    setMfaEnrollData(data)
    setMfaEnrollStep('scan')
  }

  async function handleMfaVerifyEnroll() {
    if (!mfaOtp.trim()) { setMfaError('Enter the 6-digit code from your app.'); return }
    setMfaError(''); setMfaLoading(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaEnrollData.id, code: mfaOtp.trim() })
    setMfaLoading(false)
    if (error) { setMfaError('Incorrect code. Try again.'); return }
    setMfaEnrollStep('done')
    setMfaSuccess('MFA enabled successfully. Your account is now protected.')
    setMfaFactor({ id: mfaEnrollData.id })
    setMfaOtp('')
  }

  async function handleMfaUnenroll() {
    if (!mfaFactor) return
    setMfaError(''); setMfaLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id })
    setMfaLoading(false)
    if (error) { setMfaError(error.message); return }
    setMfaFactor(null)
    setMfaSuccess('MFA removed. Your account uses password-only login.')
  }

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
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(newPassword)) { setPwError('Password must contain at least one uppercase letter.'); return }
    if (!/[0-9]/.test(newPassword)) { setPwError('Password must contain at least one number.'); return }
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
        <SettingTile
          icon={faShieldHalved}
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your admin account using an authenticator app"
          color="rgba(31,138,58,0.10)"
          iconColor="var(--green)"
          onClick={openMfa}
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

      {/* ── Modal: Two-Factor Authentication ── */}
      {modal === 'mfa' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ background: 'var(--green)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: 22, color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {mfaFactor ? 'MFA is active on your account' : 'MFA is not enabled'}
              </div>
            </div>
            <button aria-label="Close" onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          <div style={{ padding: 28 }}>
            {mfaError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{mfaError}</div>}
            {mfaSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}>{mfaSuccess}</div>}

            {/* Already enrolled */}
            {mfaFactor && mfaEnrollStep !== 'scan' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'rgba(31,138,58,0.08)', borderRadius: 10, marginBottom: 20, border: '1px solid rgba(31,138,58,0.2)' }}>
                  <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--green)', fontSize: 18 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>MFA Enabled</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>You will be asked for a code from your authenticator app at every login.</div>
                  </div>
                </div>
                <button className="btn btn-danger" style={{ width: '100%' }} disabled={mfaLoading} onClick={handleMfaUnenroll}>
                  {mfaLoading ? 'Removing…' : 'Remove MFA'}
                </button>
              </div>
            )}

            {/* Not enrolled + idle */}
            {!mfaFactor && mfaEnrollStep === 'idle' && (
              <div>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Use an authenticator app (Google Authenticator, Authy, or any TOTP app) to generate a one-time code each time you sign in.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={mfaLoading} onClick={handleMfaEnroll}>
                  {mfaLoading ? 'Setting up…' : 'Enable Two-Factor Authentication'}
                </button>
              </div>
            )}

            {/* QR scan step */}
            {mfaEnrollStep === 'scan' && mfaEnrollData && (
              <div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
                </p>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div
                    dangerouslySetInnerHTML={{ __html: mfaEnrollData.totp.qr_code }}
                    style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Manual key: <strong style={{ color: 'var(--text)', letterSpacing: 2 }}>{mfaEnrollData.totp.secret}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: 700 }}
                    value={mfaOtp}
                    onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={mfaLoading} onClick={handleMfaVerifyEnroll}>
                  {mfaLoading ? 'Verifying…' : 'Confirm & Enable MFA'}
                </button>
              </div>
            )}
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
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" />
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
