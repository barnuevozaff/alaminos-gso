import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function Section({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="card" style={{ maxWidth: 600, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <span style={{ fontSize: 18, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 22px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 18 }} />
          {children}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const { profile } = useAuth()
  const [openSection, setOpenSection] = useState(null)

  function toggle(key) {
    setOpenSection((prev) => (prev === key ? null : key))
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
    setSaving(true)
    setSigError('')
    setSigSaved(false)
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
    setSavingName(true)
    setNameError('')
    setNameSaved(false)
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
    setSavingPw(true)
    setPwError('')
    setPwSaved(false)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading settings…</div></Layout>

  return (
    <Layout>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Click a section to expand and edit.</p>

      {/* PDF Signatories */}
      <Section
        title="PDF Signatories"
        subtitle="Names printed on generated Purchase Request PDFs"
        open={openSection === 'sig'}
        onToggle={() => toggle('sig')}
      >
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 16, fontSize: 13 }}>
          Leave a field blank to leave that signature line blank on the PDF.
        </p>
        {sigError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{sigError}</div>}
        {sigSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Signatories saved.</div>}
        <div className="form-group">
          <label className="form-label">Municipal Mayor</label>
          <input className="form-input" value={mayor} onChange={(e) => setMayor(e.target.value)} placeholder="e.g. Hon. ERICSON R. LOPEZ" />
        </div>
        <div className="form-group">
          <label className="form-label">General Services Officer</label>
          <input className="form-input" value={gso} onChange={(e) => setGso(e.target.value)} placeholder="e.g. FLORENTINO J. DESTACAMENTO" />
        </div>
        <div className="form-group">
          <label className="form-label">Municipal Treasurer</label>
          <input className="form-input" value={treasurer} onChange={(e) => setTreasurer(e.target.value)} placeholder="e.g. ROWENA C. LANDICHO" />
        </div>
        <button className="btn btn-primary" disabled={saving} onClick={handleSaveSig}>
          {saving ? 'Saving…' : 'Save Signatories'}
        </button>
      </Section>

      {/* Account Settings */}
      <Section
        title="Account Settings"
        subtitle="Change your display name or password"
        open={openSection === 'account'}
        onToggle={() => toggle('account')}
      >
        {/* Display Name */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Display Name</div>
          <p className="text-muted" style={{ marginTop: -6, marginBottom: 12, fontSize: 13 }}>
            Shown in the sidebar and on audit logs.
          </p>
          {nameError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{nameError}</div>}
          {nameSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Name updated successfully.</div>}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
          </div>
          <button className="btn btn-primary" disabled={savingName} onClick={handleSaveName}>
            {savingName ? 'Saving…' : 'Update Name'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Change Password</div>
          <p className="text-muted" style={{ marginTop: -6, marginBottom: 12, fontSize: 13 }}>
            Minimum 6 characters.
          </p>
          {pwError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pwError}</div>}
          {pwSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Password changed successfully.</div>}
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
          </div>
          <button className="btn btn-primary" disabled={savingPw} onClick={handleChangePassword}>
            {savingPw ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </Section>
    </Layout>
  )
}
