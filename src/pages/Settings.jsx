import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Settings() {
  const { profile } = useAuth()

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
      <p className="page-subtitle">Manage your PDF signatories and account details.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT — PDF Signatories */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            background: 'var(--maroon)', color: '#fff',
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>✍️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>PDF Signatories</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                Names printed on generated Purchase Request PDFs
              </div>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: 24 }}>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              Leave a field blank to omit that signature line from the PDF.
            </p>

            {sigError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{sigError}</div>}
            {sigSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Signatories saved.</div>}

            <div className="form-group">
              <label className="form-label">🏛 Municipal Mayor</label>
              <input className="form-input" value={mayor} onChange={(e) => setMayor(e.target.value)} placeholder="e.g. Hon. ERICSON R. LOPEZ" />
            </div>
            <div className="form-group">
              <label className="form-label">🗂 General Services Officer</label>
              <input className="form-input" value={gso} onChange={(e) => setGso(e.target.value)} placeholder="e.g. FLORENTINO J. DESTACAMENTO" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">💰 Municipal Treasurer</label>
              <input className="form-input" value={treasurer} onChange={(e) => setTreasurer(e.target.value)} placeholder="e.g. ROWENA C. LANDICHO" />
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} disabled={saving} onClick={handleSaveSig}>
              {saving ? 'Saving…' : 'Save Signatories'}
            </button>
          </div>
        </div>

        {/* RIGHT — Account Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Display Name */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: '#2d6a4f', color: '#fff',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>👤</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Display Name</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                  Shown in the sidebar and audit logs
                </div>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {nameError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{nameError}</div>}
              {nameSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Name updated successfully.</div>}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingName} onClick={handleSaveName}>
                {savingName ? 'Saving…' : 'Update Name'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: '#1a4a7a', color: '#fff',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>🔒</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Change Password</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                  Minimum 6 characters
                </div>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {pwError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pwError}</div>}
              {pwSaved && <div className="alert alert-success" style={{ marginBottom: 12 }}>Password changed successfully.</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={savingPw} onClick={handleChangePassword}>
                {savingPw ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
