import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  FileText, Clock, CheckCircle2, XCircle,
  Boxes, PackageX, ShoppingCart, ChevronRight, Calendar,
  Plus, ClipboardList,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { timeAgo } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

const ACCENT = {
  maroon: { bg: 'rgba(122,31,43,0.08)',   color: 'var(--maroon)',    border: 'var(--maroon)' },
  gold:   { bg: 'rgba(199,154,43,0.14)',  color: 'var(--gold-dark)', border: 'var(--gold-dark)' },
  green:  { bg: 'rgba(46,125,50,0.10)',   color: 'var(--green)',     border: 'var(--green)' },
  red:    { bg: 'rgba(179,38,30,0.10)',   color: 'var(--red)',       border: 'var(--red)' },
  blue:   { bg: 'rgba(58,111,168,0.10)',  color: '#3a6fa8',          border: '#3a6fa8' },
}

const STATUS_PILL = {
  Submitted: { bg: 'rgba(199,154,43,0.14)', color: 'var(--gold-dark)', label: 'Pending' },
  Approved:  { bg: 'rgba(46,125,50,0.12)',  color: 'var(--green)',     label: 'Approved' },
  Rejected:  { bg: 'rgba(179,38,30,0.12)',  color: 'var(--red)',       label: 'Rejected' },
  'Low Stock': { bg: 'rgba(199,154,43,0.14)', color: 'var(--gold-dark)', label: 'Low Stock' },
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

// Isolated so its 1s tick only re-renders this small span, not the whole
// dashboard — the refresh timestamp is the only thing that needs to update
// every second.
function RelativeTime({ date }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!date) return null
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  let text
  if (seconds < 5) text = 'just now'
  else if (seconds < 60) text = `${seconds} second${seconds === 1 ? '' : 's'} ago`
  else {
    const mins = Math.floor(seconds / 60)
    text = `${mins} minute${mins === 1 ? '' : 's'} ago`
  }
  return <span style={{ opacity: 0.7 }}>· Updated {text}</span>
}

function StatCard({ accent, icon: Icon, label, value, sub, sparkline, summary, to, navigate, delay = 0 }) {
  const a = ACCENT[accent]
  const clickable = !!to
  const gradId = `sparkGrad-${label.replace(/[^a-zA-Z0-9]/g, '')}`
  const sparklineData = sparkline?.map((v, i) => ({ i, v }))
  const reducedMotion = usePrefersReducedMotion()

  function handleKeyDown(e) {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(to) }
  }

  return (
    <div
      className={`card dash-animate${clickable ? ' dash-card-hover' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 16, animationDelay: `${delay}s`,
        cursor: clickable ? 'pointer' : 'default', borderTop: `3px solid ${a.color}`,
      }}
      onClick={clickable ? () => navigate(to) : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${label}` : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="icon-badge" style={{ width: 38, height: 38, borderRadius: 11, background: a.bg, color: a.color }}>
          <Icon size={17} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div key={value} className="value-pulse" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 400 }}>{sub}</div>
        </div>
        {sparklineData && (
          <div style={{ width: 76, height: 38, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={a.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="basis" dataKey="v" stroke={a.color} strokeWidth={2}
                  fill={`url(#${gradId})`} isAnimationActive={!reducedMotion} animationDuration={500} animationEasing="ease"
                  dot={(props) => {
                    if (props.index !== sparklineData.length - 1) return <g key={props.index} />
                    return <circle key={props.index} cx={props.cx} cy={props.cy} r={3} fill={a.color} stroke="#fff" strokeWidth={1.5} />
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {!sparklineData && summary && (
          <span key={summary.text} className="value-pulse" style={{
            fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
            background: summary.tone === 'warning' ? 'var(--warning-tint)' : 'rgba(46,125,50,0.10)',
            color: summary.tone === 'warning' ? 'var(--warning)' : 'var(--green)',
          }}>
            {summary.text}
          </span>
        )}
        {clickable && (
          <span className="icon-badge stat-arrow" style={{ width: 30, height: 30, borderRadius: '50%', background: a.bg, color: a.color, flexShrink: 0, transition: 'transform 0.15s ease' }}>
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  )
}

function PanelCard({ title, sub, action, children, delay = 0 }) {
  return (
    <div className="card dash-animate" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', animationDelay: `${delay}s` }}>
      <div style={{
        padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function FeedIcon({ kind }) {
  const map = {
    PR: { icon: FileText, accent: ACCENT.maroon },
    RIS: { icon: ClipboardList, accent: ACCENT.blue },
    lowstock: { icon: PackageX, accent: ACCENT.gold },
  }
  const { icon: Icon, accent } = map[kind]
  return (
    <span className="icon-badge" style={{ background: accent.bg, color: accent.color }}>
      <Icon size={17} />
    </span>
  )
}

function StatusPill({ label }) {
  const c = STATUS_PILL[label] || STATUS_PILL.Submitted
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {c.label}
    </span>
  )
}

function RequestsOverviewChart({ data }) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--maroon)', display: 'inline-block' }} />
          Purchase Requests
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a6fa8', display: 'inline-block' }} />
          RIS
        </span>
      </div>
      <div style={{ height: 220, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="reqOverviewGradientPR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--maroon)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--maroon)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reqOverviewGradientRIS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a6fa8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3a6fa8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={Math.max(Math.floor(data.length / 6), 3)}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }} />
            <Area type="monotone" dataKey="pr" name="Purchase Requests" stroke="var(--maroon)" strokeWidth={2.5} fill="url(#reqOverviewGradientPR)" isAnimationActive={!reducedMotion} animationDuration={500} animationEasing="ease" />
            <Area type="monotone" dataKey="ris" name="RIS" stroke="#3a6fa8" strokeWidth={2.5} fill="url(#reqOverviewGradientRIS)" isAnimationActive={!reducedMotion} animationDuration={500} animationEasing="ease" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function buildLast30DaysSeries(rows) {
  const now = new Date()
  const days = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - idx))
    return { key: d.toDateString(), count: 0 }
  })
  rows.forEach((row) => {
    const key = new Date(row.created_at).toDateString()
    const bucket = days.find((d) => d.key === key)
    if (bucket) bucket.count += 1
  })
  return days.map((d) => d.count)
}

function buildDailySeries(prRows, risRows) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthAbbr = now.toLocaleDateString('en-US', { month: 'short' })
  const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, label: `${monthAbbr} ${i + 1}`, pr: 0, ris: 0 }))
  prRows.forEach((row) => {
    const d = new Date(row.created_at)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const bucket = days[d.getDate() - 1]
      if (bucket) bucket.pr += 1
    }
  })
  risRows.forEach((row) => {
    const d = new Date(row.created_at)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const bucket = days[d.getDate() - 1]
      if (bucket) bucket.ris += 1
    }
  })
  return days
}

const LOW_STOCK_LEVEL = (i) => i.quantity <= (i.reorder_level ?? 10)
const STATUS_VERB = { Submitted: 'submitted', Approved: 'approved', Rejected: 'rejected' }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentPRs, setRecentPRs] = useState([])
  const [recentRis, setRecentRis] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [sparkPR, setSparkPR] = useState([])
  const [sparkRIS, setSparkRIS] = useState([])
  const [sparkPO, setSparkPO] = useState([])
  const [requestsDaily, setRequestsDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const navigate = useNavigate()
  const { profile } = useAuth()

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - 29)
  const rangeLabel = `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  useEffect(() => { loadAll() }, [])

  // Silently re-fetch every 60s so the numbers/charts stay current without a
  // full page reload. Skips the loading-spinner gate (silent=true) so open
  // cards/scroll position aren't disturbed, and is cleared on unmount so it
  // doesn't keep polling after navigating away from the dashboard.
  useEffect(() => {
    const interval = setInterval(() => loadAll(true), 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadAll(silent = false) {
    if (!silent) setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const [
      { count: prTotal }, { count: prPending }, { count: prApproved }, { count: prRejected },
      { data: recentPrRows },
      { count: risTotal }, { count: risPending }, { count: risApproved }, { count: risRejected },
      { data: recentRisRows },
      { data: invRows }, { data: risInvRows },
      { count: poCount },
      { data: prLast30Rows }, { data: risLast30Rows }, { data: poLast30Rows },
      { data: prDailyRows }, { data: risDailyRows },
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
      supabase.from('inventory').select('item_name, unit, quantity, reorder_level, updated_at'),
      supabase.from('ris_inventory').select('item_name, unit, quantity, reorder_level, updated_at'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_requests').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('requisition_issue_slips').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('purchase_orders').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('purchase_requests').select('created_at').gte('created_at', startOfMonth.toISOString()),
      supabase.from('requisition_issue_slips').select('created_at').gte('created_at', startOfMonth.toISOString()),
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
      // Last-30-days totals for the System Overview cards — derived from the
      // exact same row sets used to build each sparkline below, so the big
      // number and the chart can never drift out of sync with each other.
      prLast30: (prLast30Rows || []).length,
      risLast30: (risLast30Rows || []).length,
      poLast30: (poLast30Rows || []).length,
    })
    setRecentPRs(recentPrRows || [])
    setRecentRis(recentRisRows || [])
    setLowStockItems(lowStock.slice(0, 3))
    setSparkPR(buildLast30DaysSeries(prLast30Rows || []))
    setSparkRIS(buildLast30DaysSeries(risLast30Rows || []))
    setSparkPO(buildLast30DaysSeries(poLast30Rows || []))
    setRequestsDaily(buildDailySeries(prDailyRows || [], risDailyRows || []))
    setLoading(false)
    setLastUpdated(new Date())
  }

  const feed = [
    ...recentPRs.map((r) => ({
      id: `pr-${r.id}`, kind: 'PR',
      title: `Purchase Request ${r.pr_number} has been ${STATUS_VERB[r.status] || r.status.toLowerCase()}`,
      subtitle: `${r.department || r.requester_name} · ${timeAgo(r.created_at)}`,
      status: r.status, created_at: r.created_at, to: `/admin/requests/${r.id}`,
    })),
    ...recentRis.map((r) => ({
      id: `ris-${r.id}`, kind: 'RIS',
      title: `Requisition Slip ${r.ris_number} has been ${STATUS_VERB[r.status] || r.status.toLowerCase()}`,
      subtitle: `${r.requester_name} · ${timeAgo(r.created_at)}`,
      status: r.status, created_at: r.created_at, to: `/admin/ris/${r.id}`,
    })),
    ...lowStockItems.map((item, idx) => ({
      id: `lowstock-${idx}`, kind: 'lowstock',
      title: `Inventory item "${item.item_name}" is running low`,
      subtitle: `Current stock: ${item.quantity} ${item.unit} · ${timeAgo(item.updated_at)}`,
      status: 'Low Stock', created_at: item.updated_at,
      to: item.source === 'RIS' ? '/admin/ris-inventory?filter=lowstock' : '/admin/inventory?filter=lowstock',
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)

  const combinedTotal = stats ? stats.prTotal + stats.risTotal : 0
  const approvedPct = stats && combinedTotal ? Math.round(((stats.prApproved + stats.risApproved) / combinedTotal) * 100) : 0
  const rejectedPct = stats && combinedTotal ? Math.round(((stats.prRejected + stats.risRejected) / combinedTotal) * 100) : 0
  const requestsTotalThisMonth = requestsDaily.reduce((sum, d) => sum + d.pr + d.ris, 0)

  return (
    <Layout>
      {/* Header */}
      <div className="dash-animate hero-banner-bg" style={{
        borderRadius: 'var(--radius-lg)', padding: '24px 26px', marginBottom: 'var(--space-section)',
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 20,
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Welcome back, {profile?.full_name || 'Administrator'}</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.75)' }}>Here's what's happening with your system today.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
            <Calendar size={14} aria-hidden="true" />
            <span>{rangeLabel}</span>
            <RelativeTime date={lastUpdated} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              className="btn"
              style={{ background: 'var(--maroon-dark)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 600 }}
              onClick={() => navigate('/admin/requests/new')}
            >
              <Plus size={16} style={{ marginRight: 7 }} />New Purchase Request
            </button>
            <button
              className="btn"
              style={{ background: 'var(--gold)', color: 'var(--maroon-dark)', border: 'none', fontWeight: 600 }}
              onClick={() => navigate('/requisition-issue-slip')}
            >
              <Plus size={16} style={{ marginRight: 7 }} />New RIS
            </button>
            <button
              className="btn"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', fontWeight: 600 }}
              onClick={() => navigate('/admin/requests')}
            >
              View All Requests
            </button>
          </div>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['Total PR', stats.prTotal, FileText, 'This month'],
              ['Total RIS', stats.risTotal, ClipboardList, 'This month'],
              ['Inventory Items', stats.invItems, Boxes, 'Total items'],
            ].map(([label, value, Icon, sub]) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 18px', minWidth: 116,
                position: 'relative',
              }}>
                <Icon size={14} style={{ position: 'absolute', top: 12, right: 12, opacity: 0.55 }} />
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner"></div>Loading dashboard…</div>
      ) : (
        <>
          {/* System Overview — stat grid, 2 rows x 4 */}
          <div className="dash-animate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, animationDelay: '0.05s' }}>
            System Overview
          </div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <StatCard delay={0.08} accent="maroon" icon={FileText}      label="Purchase Requests" value={stats.prLast30}  sub="Last 30 days" sparkline={sparkPR} />
            <StatCard delay={0.11} accent="blue"   icon={ClipboardList} label="RIS Transactions"  value={stats.risLast30} sub="Last 30 days" sparkline={sparkRIS} />
            <StatCard delay={0.14} accent="maroon" icon={Boxes}         label="Inventory Items"   value={stats.invItems} sub="Total items"
              summary={{
                text: stats.lowStock > 0 ? `${stats.lowStock} low stock` : 'All stocked',
                tone: stats.lowStock > 0 ? 'warning' : 'green',
              }}
            />
            <StatCard delay={0.17} accent="blue"   icon={ShoppingCart}  label="Purchase Orders"   value={stats.poLast30}  sub="Last 30 days" sparkline={sparkPO} />
          </div>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-section)' }}>
            <StatCard navigate={navigate} delay={0.2}  accent="gold"  icon={Clock}        label="Pending Approvals" value={stats.prPending + stats.risPending} sub="Awaiting review" to="/admin/requests?status=Submitted" />
            <StatCard navigate={navigate} delay={0.23} accent="green" icon={CheckCircle2} label="Approved"          value={stats.prApproved + stats.risApproved} sub={`${approvedPct}% of total`} to="/admin/requests?status=Approved" />
            <StatCard navigate={navigate} delay={0.26} accent="red"   icon={XCircle}      label="Rejected"          value={stats.prRejected + stats.risRejected} sub={`${rejectedPct}% of total`} to="/admin/requests?status=Rejected" />
            <StatCard navigate={navigate} delay={0.29} accent="gold"  icon={PackageX}     label="Low Stock"         value={stats.lowStock} sub="Needs review" to="/admin/inventory?filter=lowstock" />
          </div>

          {/* Requests Overview + Recent Activity */}
          <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 'var(--space-section)', alignItems: 'start' }}>
            <PanelCard
              title="Requests Overview"
              delay={0.32}
              action={
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  This Month
                </span>
              }
            >
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Requests Trend</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{requestsTotalThisMonth.toLocaleString()} Total Requests</span>
                </div>
                <RequestsOverviewChart data={requestsDaily} />
              </div>
            </PanelCard>

            <PanelCard
              title="Recent Activity"
              delay={0.35}
              action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/requests')}>View All</button>}
            >
              {feed.length === 0 ? (
                <div className="state-box" style={{ padding: '32px 0' }}>No activity yet.</div>
              ) : (
                <div>
                  {feed.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.to)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.to) } }}
                      role="button"
                      tabIndex={0}
                      aria-label={item.title}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                        borderBottom: idx < feed.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <FeedIcon kind={item.kind} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{item.subtitle}</div>
                      </div>
                      <StatusPill label={item.status} />
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>

          {/* Footer */}
          <div className="dash-animate" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 4px 8px', fontSize: 12, color: 'var(--text-muted)', animationDelay: '0.4s',
          }}>
            <span>© {now.getFullYear()} Municipality of Alaminos - General Services Office. All rights reserved.</span>
            <span>v1.0.0</span>
          </div>
        </>
      )}
    </Layout>
  )
}
