import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileLines, faClock, faCheck, faXmark,
  faBoxOpen, faTriangleExclamation, faFileInvoiceDollar, faCalendarDay,
  faPlus, faEye,
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'

const ACCENT = {
  maroon: { bg: 'rgba(122,30,42,0.08)', color: 'var(--maroon)', border: 'var(--maroon)' },
  gold:   { bg: 'rgba(196,136,15,0.10)', color: 'var(--gold-dark)', border: 'var(--gold-dark)' },
  green:  { bg: 'rgba(31,138,58,0.10)',  color: 'var(--green)',     border: 'var(--green)' },
  red:    { bg: 'rgba(192,49,43,0.10)',  color: 'var(--red)',       border: 'var(--red)' },
}

function StatCard({ accent, icon, label, value, sub, to, navigate }) {
  const a = ACCENT[accent]
  const clickable = !!to
  return (
    <div
      onClick={clickable ? () => navigate(to) : undefined}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${a.border}`,
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' } : undefined}
    >
      {/* faded watermark icon */}
      <FontAwesomeIcon icon={icon} style={{
        position: 'absolute', right: 18, top: 16,
        fontSize: 48, color: a.color, opacity: 0.12, pointerEvents: 'none',
      }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: a.color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
      )}
      {clickable && (
        <div style={{ fontSize: 11, color: a.color, opacity: 0.7, marginTop: 2 }}>Click to view →</div>
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, background: `linear-gradient(to right, ${a.color}, transparent)`,
        opacity: 0.35,
      }} />
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentPRs, setRecentPRs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { count: total }, { count: pending }, { count: approved }, { count: rejected },
      { count: invItems }, { data: lowStockData }, { count: poCount }, { data: requestsToday },
      { data: recent },
    ] = await Promise.all([
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Submitted'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('inventory').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('id').lte('quantity', 10),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('id').gte('created_at', new Date().toISOString().slice(0, 10)),
      supabase.from('purchase_requests').select('pr_number, department, requester_name, status, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    setStats({
      total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0,
      invItems: invItems || 0, lowStock: lowStockData?.length || 0,
      poCount: poCount || 0, requestsToday: requestsToday?.length || 0,
    })
    setRecentPRs(recent || [])
    setLoading(false)
  }

  return (
    <Layout>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--maroon) 0%, #a8293a 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24,
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Administrator Overview
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Welcome back!</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={() => navigate('/admin/requests')}
          >
            <FontAwesomeIcon icon={faEye} style={{ marginRight: 7 }} />View Requests
          </button>
          <button
            className="btn"
            style={{ background: '#fff', color: 'var(--maroon)', border: 'none', fontWeight: 700 }}
            onClick={() => navigate('/admin/requests/new')}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 7 }} />New Request
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner"></div>Loading dashboard…</div>
      ) : (
        <>
          {/* Stat Cards — 4 columns desktop, 2 tablet, 2 mobile */}
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <StatCard navigate={navigate} accent="maroon" icon={faFileLines}        label="Total Requests"   value={stats.total}        to="/admin/requests" />
            <StatCard navigate={navigate} accent="gold"   icon={faClock}            label="Pending"           value={stats.pending}       to="/admin/requests?status=Submitted" sub="Awaiting review" />
            <StatCard navigate={navigate} accent="green"  icon={faCheck}            label="Approved"          value={stats.approved}      to="/admin/requests?status=Approved" />
            <StatCard navigate={navigate} accent="red"    icon={faXmark}            label="Rejected"          value={stats.rejected}      to="/admin/requests?status=Rejected" />
          </div>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            <StatCard navigate={navigate} accent="gold"   icon={faCalendarDay}      label="Requests Today"   value={stats.requestsToday} to="/admin/requests" />
            <StatCard navigate={navigate} accent="maroon" icon={faBoxOpen}          label="Inventory Items"  value={stats.invItems}      to="/admin/inventory" />
            <StatCard navigate={navigate} accent="red"    icon={faTriangleExclamation} label="Low Stock (≤10)" value={stats.lowStock}   to="/admin/inventory?filter=lowstock" sub="Needs restocking" />
            <StatCard navigate={navigate} accent="maroon" icon={faFileInvoiceDollar} label="Purchase Orders" value={stats.poCount}       to="/admin/purchase-orders" />
          </div>

          {/* Recent Requests */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Recent Purchase Requests</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest 5 submitted requests</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/requests')}>
                <FontAwesomeIcon icon={faEye} style={{ marginRight: 6 }} />View All
              </button>
            </div>
            {recentPRs.length === 0 ? (
              <div className="state-box" style={{ padding: '32px 0' }}>No requests yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PR Number</th>
                    <th>Department</th>
                    <th>Requested By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentPRs.map((r) => (
                    <tr key={r.pr_number} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/requests`)}>
                      <td><strong>{r.pr_number}</strong></td>
                      <td>{r.department}</td>
                      <td>{r.requester_name}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate('/admin/requests') }}>
                          <FontAwesomeIcon icon={faEye} style={{ marginRight: 5 }} />View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
