import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileLines, faClock, faCheck, faXmark,
  faBoxOpen, faTriangleExclamation, faFileInvoiceDollar,
  faPlus, faEye, faClipboardList, faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { timeAgo } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

const QUICK_ACTIONS = [
  { title: 'New Purchase Request', sub: 'Draft a new PR form', icon: faFileLines, to: '/admin/requests/new', accent: 'maroon' },
  { title: 'New Requisition Slip', sub: 'Issue a RIS document', icon: faClipboardList, to: '/requisition-issue-slip', accent: 'gold' },
  { title: 'Add Inventory Item', sub: 'Register a new item', icon: faBoxOpen, to: '/admin/inventory?action=new', accent: 'maroon' },
  { title: 'Create Purchase Order', sub: 'Generate a PO', icon: faFileInvoiceDollar, to: '/admin/purchase-orders/new', accent: 'gold' },
]

const ACCENT = {
  maroon: { bg: 'rgba(122,30,42,0.08)', color: 'var(--maroon)', border: 'var(--maroon)' },
  gold:   { bg: 'rgba(196,136,15,0.10)', color: 'var(--gold-dark)', border: 'var(--gold-dark)' },
  green:  { bg: 'rgba(31,138,58,0.10)',  color: 'var(--green)',     border: 'var(--green)' },
  red:    { bg: 'rgba(192,49,43,0.10)',  color: 'var(--red)',       border: 'var(--red)' },
  blue:   { bg: 'rgba(58,111,168,0.10)', color: '#3a6fa8',          border: '#3a6fa8' },
}

// Reused across the donut and the recent-activity chips so status colors mean
// the same thing everywhere on the page.
const STATUS_COLORS = { Approved: 'var(--green)', Pending: 'var(--gold-dark)', Rejected: 'var(--red)', Processing: '#3a6fa8' }

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

function PanelCard({ title, sub, action, children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function ActivityChip({ type }) {
  const a = type === 'RIS' ? ACCENT.blue : ACCENT.maroon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: a.bg, color: a.color, fontWeight: 800, fontSize: 12,
    }}>
      {type}
    </span>
  )
}

function DonutChart({ segments, total }) {
  const [hovered, setHovered] = useState(null)
  const size = 168, stroke = 24, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const gap = total > 0 ? c * 0.014 : 0
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity={0.5} />
          {segments.map((s) => {
            if (!s.value) return null
            const frac = s.value / total
            const len = Math.max(frac * c - gap, 0)
            const dashoffset = -offset
            offset += frac * c
            const isDim = hovered && hovered !== s.label
            return (
              <circle
                key={s.label}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={s.color}
                strokeWidth={hovered === s.label ? stroke + 4 : stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 0.15s, opacity 0.15s', opacity: isDim ? 0.4 : 1, cursor: 'pointer' }}
                onMouseEnter={() => setHovered(s.label)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${s.label}: ${s.value} (${Math.round(frac * 100)}%)`}</title>
              </circle>
            )
          })}
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segments.map((s) => (
          <div
            key={s.label}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'default', opacity: hovered && hovered !== s.label ? 0.5 : 1 }}
          >
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 84 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthlyActivityChart({ data }) {
  const [hovered, setHovered] = useState(null)
  const chartH = 160
  const max = Math.max(1, ...data.flatMap((d) => [d.pr, d.ris]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--maroon)' }} />PR
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#3a6fa8' }} />RIS
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: chartH, borderBottom: '1px solid var(--border)' }}>
        {data.map((d, i) => (
          <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: chartH - 22 }}>
              <div
                onMouseEnter={() => setHovered(`${i}-pr`)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: 16, borderRadius: '4px 4px 0 0', background: 'var(--maroon)',
                  height: Math.max((d.pr / max) * (chartH - 22), d.pr > 0 ? 3 : 0),
                  opacity: hovered && hovered !== `${i}-pr` ? 0.5 : 1, transition: 'opacity .15s', cursor: 'pointer',
                }}
              >
                <title>{`${d.month} · PR: ${d.pr}`}</title>
              </div>
              <div
                onMouseEnter={() => setHovered(`${i}-ris`)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: 16, borderRadius: '4px 4px 0 0', background: '#3a6fa8',
                  height: Math.max((d.ris / max) * (chartH - 22), d.ris > 0 ? 3 : 0),
                  opacity: hovered && hovered !== `${i}-ris` ? 0.5 : 1, transition: 'opacity .15s', cursor: 'pointer',
                }}
              >
                <title>{`${d.month} · RIS: ${d.ris}`}</title>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.month}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildMonthlyActivity(prRows, risRows) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('en-US', { month: 'short' }), pr: 0, ris: 0 }
  })
  const bump = (rows, field) => {
    rows.forEach((row) => {
      const d = new Date(row.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket[field] += 1
    })
  }
  bump(prRows, 'pr')
  bump(risRows, 'ris')
  return months
}

const LOW_STOCK_LEVEL = (i) => i.quantity <= (i.reorder_level ?? 10)

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentPRs, setRecentPRs] = useState([])
  const [recentRis, setRecentRis] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [monthlyActivity, setMonthlyActivity] = useState([])
  const [recentTab, setRecentTab] = useState('pr')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const navigate = useNavigate()
  const { profile } = useAuth()

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    const [
      { count: prTotal }, { count: prPending }, { count: prApproved }, { count: prRejected },
      { data: recentPrRows },
      { count: risTotal }, { count: risPending }, { count: risApproved }, { count: risRejected },
      { data: recentRisRows },
      { data: invRows }, { data: risInvRows },
      { count: poCount },
      { data: auditRows },
      { data: prMonthlyRows }, { data: risMonthlyRows },
    ] = await Promise.all([
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Submitted'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('purchase_requests').select('id, pr_number, department, requester_name, status, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('requisition_issue_slips').select('*', { count: 'exact', head: true }),
      supabase.from('requisition_issue_slips').select('*', { count: 'exact', head: true }).eq('status', 'Submitted'),
      supabase.from('requisition_issue_slips').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('requisition_issue_slips').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('requisition_issue_slips').select('id, ris_number, requester_name, status, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('inventory').select('item_name, unit, quantity, reorder_level'),
      supabase.from('ris_inventory').select('item_name, unit, quantity, reorder_level'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('id, action, description, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('purchase_requests').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      supabase.from('requisition_issue_slips').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
    ])

    const lowStock = [
      ...(invRows || []).filter(LOW_STOCK_LEVEL).map((i) => ({ ...i, source: 'Inventory' })),
      ...(risInvRows || []).filter(LOW_STOCK_LEVEL).map((i) => ({ ...i, source: 'RIS' })),
    ].sort((a, b) => a.quantity - b.quantity)

    setStats({
      prTotal: prTotal || 0, prPending: prPending || 0, prApproved: prApproved || 0, prRejected: prRejected || 0,
      risTotal: risTotal || 0, risPending: risPending || 0, risApproved: risApproved || 0, risRejected: risRejected || 0,
      invItems: (invRows?.length || 0) + (risInvRows?.length || 0),
      lowStock: lowStock.length,
      poCount: poCount || 0,
    })
    setRecentPRs(recentPrRows || [])
    setRecentRis(recentRisRows || [])
    setLowStockItems(lowStock.slice(0, 4))
    setAuditLogs(auditRows || [])
    setMonthlyActivity(buildMonthlyActivity(prMonthlyRows || [], risMonthlyRows || []))
    setLastUpdated(new Date().toISOString())
    setLoading(false)
  }

  const recentActivity = [
    ...recentPRs.map((r) => ({ id: `pr-${r.id}`, type: 'PR', number: r.pr_number, subtitle: r.department, status: r.status, created_at: r.created_at, to: `/admin/requests/${r.id}` })),
    ...recentRis.map((r) => ({ id: `ris-${r.id}`, type: 'RIS', number: r.ris_number, subtitle: r.requester_name, status: r.status, created_at: r.created_at, to: `/admin/ris/${r.id}` })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)

  const donutSegments = stats ? [
    { label: 'Approved', value: stats.prApproved + stats.risApproved, color: STATUS_COLORS.Approved },
    { label: 'Pending', value: stats.prPending + stats.risPending, color: STATUS_COLORS.Pending },
    { label: 'Rejected', value: stats.prRejected + stats.risRejected, color: STATUS_COLORS.Rejected },
    {
      label: 'Processing',
      value: Math.max(0,
        (stats.prTotal - stats.prApproved - stats.prPending - stats.prRejected) +
        (stats.risTotal - stats.risApproved - stats.risPending - stats.risRejected)
      ),
      color: STATUS_COLORS.Processing,
    },
  ] : []
  const donutTotal = donutSegments.reduce((sum, s) => sum + s.value, 0)

  return (
    <Layout>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--maroon) 0%, #a8293a 100%)',
        borderRadius: 16, padding: '28px 28px', marginBottom: 24,
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 24,
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Administrator Overview
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Welcome back, {profile?.full_name || 'Administrator'}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{today}</p>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.85)', maxWidth: 560, lineHeight: 1.5 }}>
            Your central command for Purchase Requests, Requisition &amp; Issue Slips, and Inventory.
            Everything is up to date as of {lastUpdated ? timeAgo(lastUpdated) : 'a few seconds ago'}.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              className="btn"
              style={{ background: '#fff', color: 'var(--maroon)', border: 'none', fontWeight: 700 }}
              onClick={() => navigate('/admin/requests/new')}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 7 }} />New Request
            </button>
            <button
              className="btn"
              style={{ background: 'var(--gold)', color: 'var(--maroon-dark)', border: 'none', fontWeight: 700 }}
              onClick={() => navigate('/requisition-issue-slip')}
            >
              <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 7 }} />New RIS
            </button>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
              onClick={() => navigate('/admin/requests')}
            >
              <FontAwesomeIcon icon={faEye} style={{ marginRight: 7 }} />View Requests
            </button>
          </div>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['Total PR', stats.prTotal],
              ['Total RIS', stats.risTotal],
              ['Inventory', stats.invItems],
            ].map(([label, value]) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 20px', minWidth: 110,
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner"></div>Loading dashboard…</div>
      ) : (
        <>
          {/* Quick Actions */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Do It Fast</div>
            <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 800 }}>Quick Actions</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Start the most common tasks in a single click</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {QUICK_ACTIONS.map((a) => {
              const accent = ACCENT[a.accent]
              return (
                <div
                  key={a.title}
                  onClick={() => navigate(a.to)}
                  className="card"
                  style={{ padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = 'none' }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10, background: accent.bg, color: accent.color, fontSize: 15,
                  }}>
                    <FontAwesomeIcon icon={a.icon} />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.sub}</div>
                </div>
              )
            })}
          </div>

          {/* System Overview — stat grid, 2 rows x 4 */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            System Overview
          </div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <StatCard navigate={navigate} accent="maroon" icon={faFileLines}      label="Purchase Requests" value={stats.prTotal}  to="/admin/requests" />
            <StatCard navigate={navigate} accent="blue"   icon={faClipboardList} label="RIS Transactions"  value={stats.risTotal} to="/admin/ris" />
            <StatCard navigate={navigate} accent="maroon" icon={faBoxOpen}       label="Inventory Items"   value={stats.invItems} to="/admin/inventory" sub="Across both catalogs" />
            <StatCard navigate={navigate} accent="maroon" icon={faFileInvoiceDollar} label="Purchase Orders" value={stats.poCount} to="/admin/purchase-orders" />
          </div>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            <StatCard navigate={navigate} accent="gold"  icon={faClock}               label="Pending Approvals" value={stats.prPending + stats.risPending} to="/admin/requests?status=Submitted" sub="PR + RIS combined" />
            <StatCard navigate={navigate} accent="green" icon={faCheck}               label="Approved"          value={stats.prApproved + stats.risApproved} to="/admin/requests?status=Approved" sub="PR + RIS combined" />
            <StatCard navigate={navigate} accent="red"   icon={faXmark}               label="Rejected"          value={stats.prRejected + stats.risRejected} to="/admin/requests?status=Rejected" sub="PR + RIS combined" />
            <StatCard navigate={navigate} accent="red"   icon={faTriangleExclamation} label="Low Stock"         value={stats.lowStock} to="/admin/inventory?filter=lowstock" sub="Needs review" />
          </div>

          {/* Activity + Low Stock + Audit Logs */}
          <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
            <PanelCard
              title="Recent System Activity"
              sub="Purchase Requests & Requisition Slips combined"
              action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/requests')}>View all</button>}
            >
              {recentActivity.length === 0 ? (
                <div className="state-box" style={{ padding: '32px 0' }}>No activity yet.</div>
              ) : (
                <div>
                  {recentActivity.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.to)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                        borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <ActivityChip type={item.type} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.number} {item.status.toLowerCase()}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.subtitle || '—'}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <PanelCard title="Low Stock Alert">
                {lowStockItems.length === 0 ? (
                  <div className="state-box" style={{ padding: '24px 0' }}>All stock levels healthy.</div>
                ) : (
                  <div>
                    {lowStockItems.map((item, idx) => (
                      <div key={`${item.source}-${item.item_name}-${idx}`} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        padding: '12px 20px', borderBottom: idx < lowStockItems.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.item_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.source}</div>
                        </div>
                        <span style={{
                          background: 'rgba(196,136,15,0.12)', color: 'var(--gold-dark)', fontWeight: 700,
                          fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                        }}>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>

              <PanelCard title="Recent Audit Logs" action={<FontAwesomeIcon icon={faClockRotateLeft} style={{ color: 'var(--text-muted)' }} />}>
                {auditLogs.length === 0 ? (
                  <div className="state-box" style={{ padding: '24px 0' }}>No audit activity yet.</div>
                ) : (
                  <div>
                    {auditLogs.map((log, idx) => (
                      <div key={log.id} style={{
                        padding: '12px 20px', borderBottom: idx < auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.action} · {timeAgo(log.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>
          </div>

          {/* Charts */}
          <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>
            <PanelCard title="Overall Transaction Status" sub="Across the entire system">
              <div style={{ padding: 20 }}>
                <DonutChart segments={donutSegments} total={donutTotal} />
              </div>
            </PanelCard>
            <PanelCard title="Monthly System Activity" sub="Purchase Requests vs Requisition Slips">
              <div style={{ padding: 20 }}>
                <MonthlyActivityChart data={monthlyActivity} />
              </div>
            </PanelCard>
          </div>

          {/* Recent requests table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${recentTab === 'pr' ? '' : 'btn-secondary'}`}
                  style={recentTab === 'pr' ? { background: 'var(--maroon)', color: '#fff' } : undefined}
                  onClick={() => setRecentTab('pr')}
                >
                  Purchase Requests
                </button>
                <button
                  className={`btn btn-sm ${recentTab === 'ris' ? '' : 'btn-secondary'}`}
                  style={recentTab === 'ris' ? { background: '#3a6fa8', color: '#fff' } : undefined}
                  onClick={() => setRecentTab('ris')}
                >
                  Requisition Slips
                </button>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(recentTab === 'pr' ? '/admin/requests' : '/admin/ris')}
              >
                <FontAwesomeIcon icon={faEye} style={{ marginRight: 6 }} />View All
              </button>
            </div>

            {recentTab === 'pr' ? (
              recentPRs.length === 0 ? (
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
                      <tr key={r.pr_number} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/requests/${r.id}`)}>
                        <td><strong>{r.pr_number}</strong></td>
                        <td>{r.department}</td>
                        <td>{r.requester_name}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/requests/${r.id}`) }}>
                            <FontAwesomeIcon icon={faEye} style={{ marginRight: 5 }} />View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              recentRis.length === 0 ? (
                <div className="state-box" style={{ padding: '32px 0' }}>No requisition slips yet.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RIS Number</th>
                      <th>Requested By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRis.map((r) => (
                      <tr key={r.ris_number} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/ris/${r.id}`)}>
                        <td><strong>{r.ris_number}</strong></td>
                        <td>{r.requester_name}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/ris/${r.id}`) }}>
                            <FontAwesomeIcon icon={faEye} style={{ marginRight: 5 }} />View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
