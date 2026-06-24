import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Settings() {
  const [mayor, setMayor] = useState('')
  const [gso, setGso] = useState('')
  const [treasurer, setTreasurer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

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

  if (loading) return <Layout><div className="state-box"><div className="spinner"></div>Loading settings…</div></Layout>

  return (
    <Layout>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Configure the signatories used on generated Purchase Request PDFs.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">Signatories saved. New PDFs will use these names immediately.</div>}

      <div className="card" style={{ maxWidth: 560 }}>
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
    </Layout>
  )
}
