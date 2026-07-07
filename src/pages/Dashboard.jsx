import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  FileText, Clock, CheckCircle2, XCircle,
  Boxes, PackageX, ShoppingCart,
  Plus, Eye, ClipboardList, ScrollText, FilePlus2, ClipboardPlus, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { timeAgo } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

const QUICK_ACTIONS = [
  { title: 'New Purchase Request', sub: 'Draft a new PR form', icon: FilePlus2, to: '/admin/requests/new', accent: 'maroon' },
  { title: 'New Requisition Slip', sub: 'Issue a RIS document', icon: ClipboardPlus, to: '/requisition-issue-slip', accent: 'gold' },
  { title: 'Add Inventory Item', sub: 'Register a new item', icon: Boxes, to: '/admin/inventory?action=new', accent: 'maroon' },
  { title: 'Create Purchase Order', sub: 'Generate a PO', icon: ShoppingCart, to: '/admin/purchase-orders/new', accent: 'gold' },
]

const ACCENT = {
  maroon: { bg: 'rgba(73,20,22,0.08)',   color: 'var(--sidebar-bg)', border: 'var(--sidebar-bg)' },
  gold:   { bg: 'rgba(196,136,15,0.10)', color: 'var(--gold-dark)',  border: 'var(--gold-dark)' },
  green:  { bg: 'rgba(31,138,58,0.10)',  color: 'var(--green)',      border: 'var(--green)' },
  red:    { bg: 'rgba(192,49,43,0.10)',  color: 'var(--red)',        border: 'var(--red)' },
  blue:   { bg: 'rgba(58,111,168,0.10)', color: '#3a6fa8',           border: '#3a6fa8' },
}

// Reused across the donut and the recent-activity chips so status colors mean
// the same thing everywhere on the page.
const STATUS_COLORS = { Approved: 'var(--green)', Pending: 'var(--gold-dark)', Rejected: 'var(--red)', Processing: '#3a6fa8' }

function StatCard({ accent, icon: Icon, label, value, corner, delay = 0 }) {
  const a = ACCENT[accent]
  return (
    <div
      className="card dash-animate dash-card-hover"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="icon-badge" style={{ background: a.bg, color: a.color }}>
          <Icon size={19} />
        </span>
        {corner && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{corner}</span>}
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value.toLocaleString()}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
      </div>
    </div>
  )
}

function PanelCard({ title, icon: Icon, sub, action, children, delay = 0 }) {
  return (
    <div className="card dash-animate" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', animationDelay: `${delay}s` }}>
      <div style={{
        padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            {Icon && <Icon size={16} style={{ color: 'var(--sidebar-bg)' }} />}
            {title}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
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
    <span className="icon-badge" style={{ background: a.bg, color: a.color, fontWeight: 800, fontSize: 12 }}>
      {type}
    </span>
  )
}

function DonutChart({ segments, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 208, height: 208, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={segments} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
              {segments.map((s) => <Cell key={s.label} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
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
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
  const chartData = data.map((d) => ({ month: d.month, PR: d.pr, RIS: d.ris }))
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
      <div style={{ height: 208, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={6}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip
              cursor={{ fill: 'var(--bg)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }}
            />
            <Bar dataKey="PR" fill="var(--maroon)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="RIS" fill="#3a6fa8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const [
      { count: prTotal }, { count: prPending }, { count: prApproved }, { count: prRejected },
      { data: recentPrRows },
      { count: risTotal }, { count: risPending }, { count: risApproved }, { count: risRejected },
      { data: recentRisRows },
      { data: invRows }, { data: risInvRows },
      { count: poCount }, { count: poThisMonth },
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
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      supabase.from('audit_logs').select('id, action, description, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('purchase_requests').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      supabase.from('requisition_issue_slips').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
    ])

    const lowStock = [
      ...(invRows || []).filter(LOW_STOCK_LEVEL).map((i) => ({ ...i, source: 'Inventory' })),
      ...(risInvRows || []).filter(LOW_STOCK_LEVEL).map((i) => ({ ...i, source: 'RIS' })),
    ].sort((a, b) => a.quantity - b.quantity)

    const monthly = buildMonthlyActivity(prMonthlyRows || [], risMonthlyRows || [])
    const currentMonthBucket = monthly[monthly.length - 1]

    setStats({
      prTotal: prTotal || 0, prPending: prPending || 0, prApproved: prApproved || 0, prRejected: prRejected || 0,
      risTotal: risTotal || 0, risPending: risPending || 0, risApproved: risApproved || 0, risRejected: risRejected || 0,
      invItems: (invRows?.length || 0) + (risInvRows?.length || 0),
      lowStock: lowStock.length,
      poCount: poCount || 0,
      poThisMonth: poThisMonth || 0,
      prThisMonth: currentMonthBucket?.pr || 0,
      risThisMonth: currentMonthBucket?.ris || 0,
    })
    setRecentPRs(recentPrRows || [])
    setRecentRis(recentRisRows || [])
    setLowStockItems(lowStock.slice(0, 4))
    setAuditLogs(auditRows || [])
    setMonthlyActivity(monthly)
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

  const combinedTotal = stats ? stats.prTotal + stats.risTotal : 0
  const approvedPct = stats && combinedTotal ? Math.round(((stats.prApproved + stats.risApproved) / combinedTotal) * 100) : 0
  const rejectedPct = stats && combinedTotal ? Math.round(((stats.prRejected + stats.risRejected) / combinedTotal) * 100) : 0

  return (
    <Layout>
      {/* Header */}
      <div className="dash-animate" style={{
        background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--sidebar-accent) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '22px 24px', marginBottom: 'var(--space-section)',
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 20,
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Administrator Overview
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Welcome back, {profile?.full_name || 'Administrator'}</h1>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
            {today} · Updated {lastUpdated ? timeAgo(lastUpdated) : 'just now'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              className="btn"
              style={{ background: '#fff', color: 'var(--sidebar-bg)', border: 'none', fontWeight: 700 }}
              onClick={() => navigate('/admin/requests/new')}
            >
              <Plus size={16} style={{ marginRight: 7 }} />New Request
            </button>
            <button
              className="btn"
              style={{ background: 'var(--gold)', color: 'var(--maroon-dark)', border: 'none', fontWeight: 700 }}
              onClick={() => navigate('/requisition-issue-slip')}
            >
              <ClipboardList size={16} style={{ marginRight: 7 }} />New RIS
            </button>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
              onClick={() => navigate('/admin/requests')}
            >
              <FileText size={16} style={{ marginRight: 7 }} />View Requests
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
                background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 18px', minWidth: 104,
              }}>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{value.toLocaleString()}</div>
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
          <div className="dash-animate" style={{ marginBottom: 14, animationDelay: '0.05s' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Do It Fast</div>
            <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 800 }}>Quick Actions</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Start the most common tasks in a single click</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {QUICK_ACTIONS.map((a, i) => {
              const accent = ACCENT[a.accent]
              return (
                <div
                  key={a.title}
                  onClick={() => navigate(a.to)}
                  className="card dash-animate dash-card-hover"
                  style={{ padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, animationDelay: `${0.08 + i * 0.04}s` }}
                >
                  <span className="icon-badge" style={{ width: 38, height: 38, background: accent.bg, color: accent.color }}>
                    <a.icon size={17} />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.sub}</div>
                </div>
              )
            })}
          </div>

          {/* System Overview — stat grid, 2 rows x 4 */}
          <div className="dash-animate" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, animationDelay: '0.15s' }}>
            System Overview
          </div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <StatCard delay={0.18} accent="maroon" icon={FileText}      label="Purchase Requests" value={stats.prTotal}  corner={`${stats.prThisMonth} this month`} />
            <StatCard delay={0.21} accent="blue"   icon={ClipboardList} label="RIS Transactions"  value={stats.risTotal} corner={`${stats.risThisMonth} this month`} />
            <StatCard delay={0.24} accent="maroon" icon={Boxes}         label="Inventory Items"   value={stats.invItems} corner="2 catalogs" />
            <StatCard delay={0.27} accent="blue"   icon={ShoppingCart}  label="Purchase Orders"   value={stats.poCount}  corner={`${stats.poThisMonth} this month`} />
          </div>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            <StatCard delay={0.3}  accent="gold"  icon={Clock}        label="Pending Approvals" value={stats.prPending + stats.risPending} corner="Awaiting review" />
            <StatCard delay={0.33} accent="green" icon={CheckCircle2} label="Approved"          value={stats.prApproved + stats.risApproved} corner={`${approvedPct}% of total`} />
            <StatCard delay={0.36} accent="red"   icon={XCircle}      label="Rejected"          value={stats.prRejected + stats.risRejected} corner={`${rejectedPct}% of total`} />
            <StatCard delay={0.39} accent="gold"  icon={PackageX}      label="Low Stock"         value={stats.lowStock} corner="Needs review" />
          </div>

          {/* Activity + Low Stock + Audit Logs */}
          <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 'var(--space-section)', alignItems: 'start' }}>
            <PanelCard
              delay={0.42}
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
              <PanelCard title="Low Stock Alert" icon={AlertTriangle} delay={0.45}>
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

              <PanelCard title="Recent Audit Logs" icon={ScrollText} delay={0.48}>
                {auditLogs.length === 0 ? (
                  <div className="state-box" style={{ padding: '24px 0' }}>No audit activity yet.</div>
                ) : (
                  <div>
                    {auditLogs.map((log, idx) => (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                          borderBottom: idx < auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <span className="icon-badge" style={{ background: ACCENT.maroon.bg, color: ACCENT.maroon.color }}>
                          <ScrollText size={17} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{log.description}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.action}</div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(log.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>
          </div>

          {/* Charts */}
          <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 'var(--space-section)', alignItems: 'stretch' }}>
            <PanelCard title="Overall Transaction Status" sub="Across the entire system" delay={0.51}>
              <div style={{ padding: 20 }}>
                <DonutChart segments={donutSegments} total={donutTotal} />
              </div>
            </PanelCard>
            <PanelCard title="Monthly System Activity" sub="Purchase Requests vs Requisition Slips" delay={0.54}>
              <div style={{ padding: 20 }}>
                <MonthlyActivityChart data={monthlyActivity} />
              </div>
            </PanelCard>
          </div>

          {/* Recent requests table */}
          <div className="card dash-animate" style={{ padding: 0, overflow: 'hidden', animationDelay: '0.57s' }}>
            <div style={{
              padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${recentTab === 'pr' ? '' : 'btn-secondary'}`}
                  style={recentTab === 'pr' ? { background: 'var(--sidebar-bg)', color: '#fff' } : undefined}
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
                <Eye size={16} style={{ marginRight: 6 }} />View All
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
                            <Eye size={14} style={{ marginRight: 5 }} />View
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
                            <Eye size={14} style={{ marginRight: 5 }} />View
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
