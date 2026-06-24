import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  return (
    <Layout>
      <h1 className="page-title">Audit Logs</h1>
      <p className="page-subtitle">System-wide record of approvals, rejections, and document generation.</p>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="state-box">No audit activity yet.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>When</th><th>Action</th><th>Description</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td><code>{log.action}</code></td>
                  <td>{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
