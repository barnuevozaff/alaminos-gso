import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { Zap, Wallet, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { fmt } from '../lib/fmt'
import { MONTH_NAMES, compareAmounts, previousPeriod } from '../lib/energyUtils'

const ACCENT = {
  maroon: { bg: 'rgba(122,31,43,0.08)',  color: 'var(--maroon)' },
  gold:   { bg: 'rgba(199,154,43,0.14)', color: 'var(--gold-dark)' },
  green:  { bg: 'rgba(46,125,50,0.10)',  color: 'var(--green)' },
  red:    { bg: 'rgba(179,38,30,0.10)',  color: 'var(--red)' },
  blue:   { bg: 'rgba(58,111,168,0.10)', color: '#3a6fa8' },
}

function StatCard({ accent, icon: Icon, label, value, sub }) {
  const a = ACCENT[accent]
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: `3px solid ${a.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="icon-badge" style={{ width: 38, height: 38, borderRadius: 11, background: a.bg, color: a.color }}>
          <Icon size={17} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  )
}

function PanelCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      </div>
      <div style={{ padding: '16px 20px 20px' }}>{children}</div>
    </div>
  )
}

const PIE_COLORS = { increase: 'var(--red)', decrease: 'var(--green)', none: 'var(--text-muted)' }
const YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1]
})()

export default function EnergyDashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [accounts, setAccounts] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: accData }, { data: billData }] = await Promise.all([
      supabase.from('energy_accounts').select('*').order('account_number'),
      supabase.from('energy_bills').select('*, energy_accounts(account_number, account_name)'),
    ])
    setAccounts(accData || [])
    setBills(billData || [])
    setLoading(false)
  }

  const prev = previousPeriod(year, month)

  const billsThisMonth = useMemo(
    () => bills.filter((b) => b.billing_month === month && b.billing_year === year),
    [bills, month, year]
  )
  const billsPrevMonth = useMemo(
    () => bills.filter((b) => b.billing_month === prev.month && b.billing_year === prev.year),
    [bills, prev.month, prev.year]
  )
  const billsThisYear = useMemo(() => bills.filter((b) => b.billing_year === year), [bills, year])

  const totalMonthExpense = billsThisMonth.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalPrevMonthExpense = billsPrevMonth.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalYearExpense = billsThisYear.reduce((sum, b) => sum + Number(b.amount), 0)
  const overall = compareAmounts(totalMonthExpense, billsPrevMonth.length > 0 ? totalPrevMonthExpense : null)

  const highest = billsThisMonth.length > 0
    ? billsThisMonth.reduce((max, b) => (Number(b.amount) > Number(max.amount) ? b : max))
    : null
  const lowest = billsThisMonth.length > 0
    ? billsThisMonth.reduce((min, b) => (Number(b.amount) < Number(min.amount) ? b : min))
    : null

  const trendData = useMemo(() => {
    const periods = []
    let y = year, m = month
    for (let i = 0; i < 12; i++) {
      periods.unshift({ year: y, month: m })
      const p = previousPeriod(y, m)
      y = p.year; m = p.month
    }
    return periods.map((p) => ({
      label: `${MONTH_NAMES[p.month - 1].slice(0, 3)} ${String(p.year).slice(2)}`,
      total: bills.filter((b) => b.billing_month === p.month && b.billing_year === p.year)
        .reduce((sum, b) => sum + Number(b.amount), 0),
    }))
  }, [bills, month, year])

  const perAccountData = useMemo(() => {
    return accounts.map((acc) => {
      const bill = billsThisMonth.find((b) => b.account_id === acc.id)
      return { label: acc.account_name || acc.account_number, amount: bill ? Number(bill.amount) : 0 }
    }).filter((d) => d.amount > 0)
  }, [accounts, billsThisMonth])

  const pieData = useMemo(() => {
    let increase = 0, decrease = 0, none = 0
    accounts.forEach((acc) => {
      const cur = billsThisMonth.find((b) => b.account_id === acc.id)
      if (!cur) return
      const prevBill = billsPrevMonth.find((b) => b.account_id === acc.id)
      const cmp = compareAmounts(Number(cur.amount), prevBill ? Number(prevBill.amount) : null)
      if (cmp.status === 'increase') increase++
      else if (cmp.status === 'decrease') decrease++
      else none++
    })
    return [
      { name: 'Increased', key: 'increase', value: increase },
      { name: 'Decreased', key: 'decrease', value: decrease },
      { name: 'No Change', key: 'none', value: none },
    ].filter((d) => d.value > 0)
  }, [accounts, billsThisMonth, billsPrevMonth])

  return (
    <Layout>
      <h1 className="page-title">Energy Consumption Dashboard</h1>
      <p className="page-subtitle">Electricity accounts and monthly expense monitoring.</p>

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Month</label>
          <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Year</label>
          <select className="form-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner"></div>Loading energy data…</div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <StatCard accent="maroon" icon={Zap} label="Registered Accounts" value={accounts.length} sub="Total electricity accounts" />
            <StatCard accent="gold" icon={Wallet} label={`${MONTH_NAMES[month - 1]} Expense`} value={`₱${fmt(totalMonthExpense)}`} sub={`${billsThisMonth.length} of ${accounts.length} accounts billed`} />
            <StatCard accent="blue" icon={CalendarDays} label={`${year} Expense`} value={`₱${fmt(totalYearExpense)}`} sub={`Year-to-date total for ${year}`} />
            <StatCard
              accent={overall.status === 'increase' ? 'red' : overall.status === 'decrease' ? 'green' : 'blue'}
              icon={overall.status === 'increase' ? TrendingUp : TrendingDown}
              label="vs Previous Month"
              value={overall.status === 'none' ? 'No prior data' : `${overall.status === 'increase' ? '▲' : '▼'} ₱${fmt(Math.abs(overall.diff))}`}
              sub={overall.status === 'none' ? `No bills recorded for ${MONTH_NAMES[prev.month - 1]} ${prev.year}` : `${overall.pct >= 0 ? '+' : ''}${overall.pct.toFixed(1)}% compared to ${MONTH_NAMES[prev.month - 1]} ${prev.year}`}
            />
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
            <StatCard accent="red" icon={TrendingUp} label="Highest Consuming Account" value={highest ? (highest.energy_accounts?.account_name || highest.energy_accounts?.account_number) : '—'} sub={highest ? `₱${fmt(highest.amount)}` : 'No bills recorded this month'} />
            <StatCard accent="green" icon={TrendingDown} label="Lowest Consuming Account" value={lowest ? (lowest.energy_accounts?.account_name || lowest.energy_accounts?.account_number) : '—'} sub={lowest ? `₱${fmt(lowest.amount)}` : 'No bills recorded this month'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
            <PanelCard title="Monthly Energy Expense Trend">
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="energyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--maroon)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--maroon)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={1} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip formatter={(v) => `₱${fmt(v)}`} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" name="Total Expense" stroke="var(--maroon)" strokeWidth={2.5} fill="url(#energyTrendGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PanelCard>

            <PanelCard title="Increase vs Decrease">
              {pieData.length === 0 ? (
                <div className="state-box" style={{ padding: '24px 0' }}>No comparison data yet.</div>
              ) : (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {pieData.map((d) => <Cell key={d.key} fill={PIE_COLORS[d.key]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </PanelCard>
          </div>

          <PanelCard title={`Per-Account Consumption — ${MONTH_NAMES[month - 1]} ${year}`}>
            {perAccountData.length === 0 ? (
              <div className="state-box" style={{ padding: '24px 0' }}>No bills recorded for this month yet.</div>
            ) : (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perAccountData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip formatter={(v) => `₱${fmt(v)}`} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Bar dataKey="amount" name="Amount" fill="var(--maroon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </PanelCard>
        </>
      )}
    </Layout>
  )
}
