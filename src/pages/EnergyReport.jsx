import { useEffect, useMemo, useState } from 'react'
import { Printer, FileDown, FileSpreadsheet, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import EnergyReportPrintModal from '../components/EnergyReportPrintModal'
import { fmt } from '../lib/fmt'
import { MONTH_NAMES, compareAmounts, previousPeriod, periodKey } from '../lib/energyUtils'
import { generateEnergyReportPdf } from '../lib/generateEnergyReportPdf'
import { generateEnergyReportExcel } from '../lib/generateEnergyReportExcel'

const PAGE_SIZE = 15
const now = new Date()

function StatusTag({ status }) {
  if (status === 'increase') return <span style={{ color: 'var(--red)', fontWeight: 600 }}>▲ Increased</span>
  if (status === 'decrease') return <span style={{ color: 'var(--green)', fontWeight: 600 }}>▼ Decreased</span>
  return <span className="text-muted">No Change</span>
}

function SortHeader({ label, sortKey, active, dir, onSort }) {
  return (
    <th style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => onSort(sortKey)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </span>
    </th>
  )
}

export default function EnergyReport() {
  const [mode, setMode] = useState('comparison')
  const [accounts, setAccounts] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function sixMonthsBack(y, m) {
    let period = { year: y, month: m }
    for (let i = 0; i < 6; i++) period = previousPeriod(period.year, period.month)
    return period
  }
  const sixMonthsAgo = sixMonthsBack(now.getFullYear(), now.getMonth() + 1)
  const [fromMonth, setFromMonth] = useState(sixMonthsAgo.month)
  const [fromYear, setFromYear] = useState(sixMonthsAgo.year)
  const [toMonth, setToMonth] = useState(now.getMonth() + 1)
  const [toYear, setToYear] = useState(now.getFullYear())

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('All')
  const [sortKey, setSortKey] = useState('account_number')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: accData }, { data: billData }] = await Promise.all([
      supabase.from('energy_accounts').select('*').order('account_number'),
      supabase.from('energy_bills').select('*, energy_accounts(account_number, account_name, location, meter_number)'),
    ])
    setAccounts(accData || [])
    setBills(billData || [])
    setLoading(false)
  }

  useEffect(() => { setPage(1) }, [mode, search, location, month, year, fromMonth, fromYear, toMonth, toYear])

  const locations = useMemo(() => ['All', ...new Set(accounts.map((a) => a.location).filter(Boolean))], [accounts])

  const prev = previousPeriod(year, month)

  const comparisonRows = useMemo(() => {
    return accounts.map((acc) => {
      const cur = bills.find((b) => b.account_id === acc.id && b.billing_month === month && b.billing_year === year)
      const prevBill = bills.find((b) => b.account_id === acc.id && b.billing_month === prev.month && b.billing_year === prev.year)
      const current = cur ? Number(cur.amount) : null
      const previous = prevBill ? Number(prevBill.amount) : null
      const cmp = current == null ? { diff: null, pct: null, status: 'none' } : compareAmounts(current, previous)
      return {
        id: acc.id, account_number: acc.account_number, account_name: acc.account_name,
        location: acc.location, meter_number: acc.meter_number,
        current, previous, diff: cmp.diff, pct: cmp.pct, status: cmp.status,
      }
    })
  }, [accounts, bills, month, year, prev.month, prev.year])

  const rangeRows = useMemo(() => {
    const fromKey = periodKey(fromYear, fromMonth)
    const toKey = periodKey(toYear, toMonth)
    return bills
      .filter((b) => {
        const k = periodKey(b.billing_year, b.billing_month)
        return k >= fromKey && k <= toKey
      })
      .map((b) => ({
        id: b.id, account_number: b.energy_accounts?.account_number, account_name: b.energy_accounts?.account_name,
        location: b.energy_accounts?.location, meter_number: b.energy_accounts?.meter_number,
        billing_month: b.billing_month, billing_year: b.billing_year, amount: Number(b.amount),
      }))
  }, [bills, fromMonth, fromYear, toMonth, toYear])

  const filteredComparison = useMemo(() => comparisonRows.filter((r) => {
    const matchesSearch = !search || r.account_number?.toLowerCase().includes(search.toLowerCase()) || r.account_name?.toLowerCase().includes(search.toLowerCase())
    const matchesLocation = location === 'All' || r.location === location
    return matchesSearch && matchesLocation
  }), [comparisonRows, search, location])

  const filteredRange = useMemo(() => rangeRows.filter((r) => {
    const matchesSearch = !search || r.account_number?.toLowerCase().includes(search.toLowerCase()) || r.account_name?.toLowerCase().includes(search.toLowerCase())
    const matchesLocation = location === 'All' || r.location === location
    return matchesSearch && matchesLocation
  }), [rangeRows, search, location])

  const sortedRows = useMemo(() => {
    const rows = mode === 'comparison' ? [...filteredComparison] : [...filteredRange]
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (sortKey === 'period') { av = periodKey(a.billing_year, a.billing_month); bv = periodKey(b.billing_year, b.billing_month) }
      if (av == null) av = mode === 'comparison' && (sortKey === 'current' || sortKey === 'previous' || sortKey === 'diff') ? -Infinity : ''
      if (bv == null) bv = mode === 'comparison' && (sortKey === 'current' || sortKey === 'previous' || sortKey === 'diff') ? -Infinity : ''
      if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv).toLowerCase() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [mode, filteredComparison, filteredRange, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(() => {
    if (mode === 'comparison') {
      const grandTotal = filteredComparison.reduce((sum, r) => sum + (r.current || 0), 0)
      const prevTotal = filteredComparison.reduce((sum, r) => sum + (r.previous || 0), 0)
      const hasAnyPrev = filteredComparison.some((r) => r.previous != null)
      const overall = compareAmounts(grandTotal, hasAnyPrev ? prevTotal : null)
      return {
        grandTotal,
        increased: filteredComparison.filter((r) => r.status === 'increase').length,
        decreased: filteredComparison.filter((r) => r.status === 'decrease').length,
        overall,
      }
    }
    return { grandTotal: filteredRange.reduce((sum, r) => sum + r.amount, 0) }
  }, [mode, filteredComparison, filteredRange])

  // Official printed report mirrors the GSO's paper template: a single
  // "Monthly Electricity Consumption" table with the selected month and the
  // 2 months before it as columns (oldest to newest, left to right), one
  // "Total Amount" row aggregated across every account — no per-account
  // breakdown, no location/meter columns. Only meaningful in comparison mode.
  const threeMonthTrend = useMemo(() => {
    if (mode !== 'comparison') return []
    let period = { year, month }
    const periods = [period]
    for (let i = 0; i < 2; i++) {
      period = previousPeriod(period.year, period.month)
      periods.unshift(period)
    }
    return periods.map((p) => ({
      month: p.month,
      year: p.year,
      label: MONTH_NAMES[p.month - 1],
      total: bills.filter((b) => b.billing_month === p.month && b.billing_year === p.year)
        .reduce((sum, b) => sum + Number(b.amount), 0),
    }))
  }, [mode, bills, month, year])

  const trendComparison = threeMonthTrend.length === 3
    ? compareAmounts(threeMonthTrend[2].total, threeMonthTrend[1].total)
    : { diff: null, pct: null, status: 'none' }

  const periodLabel = mode === 'comparison'
    ? `${MONTH_NAMES[month - 1]} ${year}`
    : `${MONTH_NAMES[fromMonth - 1]} ${fromYear} – ${MONTH_NAMES[toMonth - 1]} ${toYear}`

  function handleExportPdf() {
    generateEnergyReportPdf({ mode, periodLabel, rows: sortedRows, summary, threeMonthTrend, trendComparison })
  }
  function handleExportExcel() {
    generateEnergyReportExcel({ mode, periodLabel, rows: sortedRows, summary })
  }

  return (
    <Layout>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Energy Consumption Report</h1>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>Compare monthly electricity spend per account, or review a multi-month history.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" disabled={loading || sortedRows.length === 0} onClick={handleExportExcel}>
            <FileSpreadsheet size={16} style={{ marginRight: 6 }} />Export Excel
          </button>
          <button className="btn btn-outline" disabled={loading || sortedRows.length === 0} onClick={handleExportPdf}>
            <FileDown size={16} style={{ marginRight: 6 }} />Export PDF
          </button>
          <button className="btn btn-primary" disabled={loading || sortedRows.length === 0} onClick={() => setShowPrint(true)}>
            <Printer size={16} style={{ marginRight: 6 }} />Print
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="form-label">Report Mode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${mode === 'comparison' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('comparison')}>Month Comparison</button>
            <button className={`btn btn-sm ${mode === 'range' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('range')}>Date Range History</button>
          </div>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 20 }}>
        {mode === 'comparison' ? (
          <>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }} />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">From</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="form-select" value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="form-input" value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} style={{ width: 90 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="form-select" value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="form-input" value={toYear} onChange={(e) => setToYear(Number(e.target.value))} style={{ width: 90 }} />
              </div>
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">Search Account</label>
          <input className="form-input" placeholder="Account number or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <select className="form-select" value={location} onChange={(e) => setLocation(e.target.value)}>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div className="state-box"><div className="spinner"></div>Loading report…</div>
        ) : sortedRows.length === 0 ? (
          <div className="state-box">
            <div className="state-title">No data for this selection</div>
            Try a different period, or clear the search/location filters.
          </div>
        ) : mode === 'comparison' ? (
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Account Number" sortKey="account_number" active={sortKey === 'account_number'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Location" sortKey="location" active={sortKey === 'location'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Meter Number" sortKey="meter_number" active={sortKey === 'meter_number'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Current Month" sortKey="current" active={sortKey === 'current'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Previous Month" sortKey="previous" active={sortKey === 'previous'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Difference" sortKey="diff" active={sortKey === 'diff'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" sortKey="status" active={sortKey === 'status'} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.account_number}</strong></td>
                  <td>{r.location}</td>
                  <td>{r.meter_number}</td>
                  <td>{r.current != null ? `₱${fmt(r.current)}` : '—'}</td>
                  <td className="text-muted">{r.previous != null ? `₱${fmt(r.previous)}` : '—'}</td>
                  <td>{r.diff != null ? `${r.diff >= 0 ? '+' : ''}₱${fmt(r.diff)} (${r.pct.toFixed(1)}%)` : '—'}</td>
                  <td><StatusTag status={r.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                <td style={{ fontWeight: 700 }}>₱{fmt(summary.grandTotal)}</td>
                <td colSpan={3} className="text-muted">
                  {summary.increased} increased · {summary.decreased} decreased
                  {summary.overall.status !== 'none' && ` · Overall ${summary.overall.status === 'increase' ? 'Increased' : 'Decreased'} by ₱${fmt(Math.abs(summary.overall.diff))} (${Math.abs(summary.overall.pct).toFixed(1)}%)`}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Account Number" sortKey="account_number" active={sortKey === 'account_number'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Location" sortKey="location" active={sortKey === 'location'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Meter Number" sortKey="meter_number" active={sortKey === 'meter_number'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Billing Period" sortKey="period" active={sortKey === 'period'} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Amount" sortKey="amount" active={sortKey === 'amount'} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.account_number}</strong></td>
                  <td>{r.location}</td>
                  <td>{r.meter_number}</td>
                  <td>{MONTH_NAMES[r.billing_month - 1]} {r.billing_year}</td>
                  <td>₱{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                <td style={{ fontWeight: 700 }}>₱{fmt(summary.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {!loading && sortedRows.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {showPrint && (
        <EnergyReportPrintModal
          mode={mode}
          periodLabel={periodLabel}
          rows={sortedRows}
          summary={summary}
          threeMonthTrend={threeMonthTrend}
          trendComparison={trendComparison}
          onClose={() => setShowPrint(false)}
        />
      )}
    </Layout>
  )
}
