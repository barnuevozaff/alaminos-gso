import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Settings() {
  const { profile } = useAuth()

  // PDF Signatories state
  const [mayor, setMayor] = useState('')
  const [gso, setGso] = useState('')
  const [treasurer, setTreasurer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Change name state
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (profile) setDisplayName(profile.full_name || '')
  }, [profile])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('pdf_signatories').select('*').eq('id', 1).maybeSingle()
    if (error) setError(error.message)
    if (data) {
      setMayor(data.municipal_mayor || '')
      setGso(data.general_services_officer || '')
      setTreasurer(data.municipal_treasurer || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await supabase.from('pdf_signatories').upsert({
      id: 1,
      municipal_mayor: mayor || null,
      general_services_officer: gso || null,
      municipal_treasurer: treasurer || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSaveName() {
    if (!displayName.trim()) { setNameError('Name cannot be blank.'); return }
    setSavingName(true)
    setNameError('')
    setNameSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: displayName.trim() })
      .eq('id', profile.id)
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
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading settings…</div></Layout>

  return (
    <Layout>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage signatories, your account name, and password.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">Signatories saved. New PDFs will use these names immediately.</div>}

      <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>PDF Signatories</h3>
        <p className="text-muted" style={{ marginTop: -8, fontSize: 13 }}>
          Leave a field blank to leave that signature line blank on the PDF — it will not show a placeholder.
        </p>

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

        <div className="print-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Signatories'}</button>
        </div>
      </div>

      {/* Change Display Name */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Account Name</h3>
        <p className="text-muted" style={{ marginTop: -8, fontSize: 13 }}>
          This is the name shown in the sidebar and on audit logs.
        </p>

        {nameError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{nameError}</div>}
        {nameSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Name updated successfully.</div>}

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div className="print-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={savingName} onClick={handleSaveName}>
            {savingName ? 'Saving…' : 'Update Name'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Change Password</h3>
        <p className="text-muted" style={{ marginTop: -8, fontSize: 13 }}>
          Must be at least 6 characters.
        </p>

        {pwError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pwError}</div>}
        {pwSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Password changed successfully.</div>}

        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            type="password"
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
        </div>

        <div className="print-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={savingPw} onClick={handleChangePassword}>
            {savingPw ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
