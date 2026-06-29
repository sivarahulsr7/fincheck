import { useState } from 'react'
import { Eye, EyeOff, Bell, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useFinanceStore } from '../store/useFinanceStore'
import Amount from '../components/common/Amount'
import { CATEGORIES } from '../utils/constants'
import { fmt, fmtPct, nDaysAgo, monthKey, startOfMonth, endOfMonth } from '../utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip
} from 'recharts'

const TIME_FILTERS = [
  { id: '7d',  label: '7D',  days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
]

const MONTH_FILTERS = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL']

function monthsForFilter(filter) {
  const now = new Date()
  if (filter === '1M') return 1
  if (filter === '3M') return 3
  if (filter === '6M') return 6
  if (filter === 'YTD') return now.getMonth() + 1
  if (filter === '1Y') return 12
  return 24
}

export default function Overview() {
  const { balancesHidden, toggleBalances } = useAppStore()
  const { transactions, accounts, assets, liabilities, goals, getNetWorth, loading } = useFinanceStore()
  const [cfFilter, setCfFilter] = useState('30d')
  const [mFilter, setMFilter] = useState('1M')
  const [cashflowOpen, setCashflowOpen] = useState(true)
  const [wealthOpen, setWealthOpen] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)

  const netWorth = getNetWorth()

  // Cashflow for top card
  const cfDays = TIME_FILTERS.find((f) => f.id === cfFilter)?.days || 30
  const since = nDaysAgo(cfDays)
  const cfTxs = transactions.filter((t) => t.date >= since)
  const cfIn  = cfTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const cfOut = cfTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Monthly cashflow section
  const months = monthsForFilter(mFilter)
  const mStart = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - months + 1, 1); return d.toISOString().split('T')[0]
  })()
  const mTxs = transactions.filter((t) => t.date >= mStart)
  const mIncome  = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const mExpense = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const mOverspent = mExpense > mIncome

  // Where it went (category breakdown for current period)
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); const tmStr = thisMonthStart.toISOString().split('T')[0]
  const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date >= tmStr)
  const totalExp = monthExpenses.reduce((s, t) => s + Number(t.amount), 0)
  const catBreakdown = CATEGORIES.filter((c) => c.type === 'expense').map((cat) => {
    const spent = monthExpenses.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + Number(t.amount), 0)
    return { ...cat, spent, pct: totalExp > 0 ? Math.round((spent / totalExp) * 100) : 0 }
  }).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent)

  // Where it came from
  const monthIncome = transactions.filter((t) => t.type === 'income' && t.date >= tmStr)
  const totalInc = monthIncome.reduce((s, t) => s + Number(t.amount), 0)

  // Investments
  const totalInvested = assets.reduce((s, a) => s + (a.investedAmount || 0), 0)
  const totalCurrent  = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
  const investPct = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0

  // Total liabilities
  const totalLiab = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const today = new Date().getDate()

  return (
    <div className="page-content px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Overview</p>
          <p className="text-base font-bold text-white leading-tight mt-0.5">Fin Check</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleBalances}
            className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400">
            {balancesHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400 relative">
            <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className={`rounded-2xl border p-4 mb-3 bg-card ${netWorth < 0 ? 'border-red-dim' : 'border-card-border'}`}>
        <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-3">NET WORTH · ₹ INR</p>
        <Amount value={netWorth} className="text-2xl font-bold text-white" />
        <button className="mt-3 text-green text-xs font-medium">View history →</button>
      </div>

      {/* Cashflow top card */}
      <div className="rounded-2xl border border-card-border bg-card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">CASHFLOW</p>
          <div className="flex gap-1">
            {TIME_FILTERS.map((f) => (
              <button key={f.id} onClick={() => setCfFilter(f.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${cfFilter === f.id ? 'bg-card-2 text-white' : 'text-gray-500'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">In</p>
            <Amount value={cfIn} className="text-green text-sm font-semibold" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Out</p>
            <Amount value={cfOut} className="text-red text-sm font-semibold" />
          </div>
        </div>
        <button className="mt-2 text-green text-xs font-medium">View insights →</button>
      </div>

      {/* Wealth collapsible */}
      <div className="rounded-2xl border border-card-border bg-card mb-3 overflow-hidden">
        <button onClick={() => setWealthOpen((o) => !o)}
          className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {wealthOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            <span className="text-sm font-semibold text-white">⚖️ Wealth</span>
          </div>
          <div className="flex items-center gap-2">
            <Amount value={netWorth} className="text-sm text-gray-300" />
            {totalLiab > 0 && <span className="text-xs text-red">-{fmtPct(totalLiab > 0 ? -2.5 : 0)}</span>}
          </div>
        </button>
        {wealthOpen && (
          <div className="px-4 pb-4 border-t border-card-border">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-card-2 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 mb-1">ASSETS</p>
                <Amount value={totalCurrent + accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0)} className="text-sm font-bold text-green" />
              </div>
              <div className="bg-card-2 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 mb-1">LIABILITIES</p>
                <Amount value={totalLiab} className="text-sm font-bold text-red" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cashflow collapsible - detailed */}
      <div className="rounded-2xl border border-card-border bg-card mb-3 overflow-hidden">
        <button onClick={() => setCashflowOpen((o) => !o)}
          className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {cashflowOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            <span className="text-sm font-semibold text-white">⇄ Cashflow</span>
          </div>
          <div className="flex items-center gap-2">
            <Amount value={mIncome - mExpense} className={`text-sm font-semibold ${mIncome >= mExpense ? 'text-green' : 'text-red'}`} />
            <span className="text-xs bg-card-2 rounded-lg px-2 py-0.5 text-gray-400">{mFilter}</span>
          </div>
        </button>

        {cashflowOpen && (
          <div className="px-4 pb-4 border-t border-card-border">
            {/* Month filter */}
            <div className="flex gap-1 mt-3 mb-3">
              {MONTH_FILTERS.map((f) => (
                <button key={f} onClick={() => setMFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${mFilter === f ? 'bg-card-2 text-white' : 'text-gray-500'}`}>
                  {f}
                </button>
              ))}
            </div>

            {mExpense > mIncome && mExpense > 0 && (
              <p className="text-red text-xs mb-3">
                Spent {Math.round((mExpense / Math.max(mIncome, 1)) * 100)}% · day {today}/{daysInMonth} →
              </p>
            )}

            {/* IN */}
            <div className="rounded-xl bg-green-tint border border-green-dim p-3 mb-2">
              <div className="flex items-center gap-1 mb-1">
                <ArrowDownLeft size={13} className="text-green" />
                <span className="text-[10px] font-bold tracking-widest text-green">IN</span>
              </div>
              <Amount value={mIncome} className="text-lg font-bold text-green" />
              <p className="text-[11px] text-gray-400 mt-0.5">all income</p>
            </div>

            {/* OUT */}
            <div className="rounded-xl bg-red-tint border border-red-dim p-3 mb-2">
              <div className="flex items-center gap-1 mb-1">
                <ArrowUpRight size={13} className="text-red" />
                <span className="text-[10px] font-bold tracking-widest text-red">OUT</span>
              </div>
              <Amount value={mExpense} className="text-lg font-bold text-red" />
            </div>

            {/* Overspent */}
            {mOverspent && mExpense > 0 && (
              <div className="rounded-xl bg-red-tint border border-red-dim p-3 mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle size={13} className="text-red" />
                  <span className="text-[10px] font-bold tracking-widest text-red">OVERSPENT</span>
                </div>
                <Amount value={mExpense - mIncome} className="text-base font-bold text-red" />
              </div>
            )}

            {/* Where it went */}
            {catBreakdown.length > 0 && (
              <div className="rounded-xl bg-card-2 p-3 mb-2">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-3">WHERE IT WENT</p>
                <div className="flex flex-col gap-2.5">
                  {catBreakdown.slice(0, 6).map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <Amount value={cat.spent} className="text-xs text-gray-400" />
                          <span className="text-xs text-red font-medium">+{cat.pct}%</span>
                        </div>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill bg-red" style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Where it came from */}
            <div className="rounded-xl bg-card-2 p-3 mb-3">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">WHERE IT CAME FROM</p>
              {monthIncome.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-gray-500 text-sm">No income in this period.</p>
                  <button className="text-green text-xs mt-1">Add income →</button>
                </div>
              ) : (
                <Amount value={totalInc} className="text-base font-bold text-green" />
              )}
            </div>

            {/* Quick links */}
            <div className="flex gap-4 text-green text-xs font-medium flex-wrap">
              <button>Insights →</button>
              <button>Edit budget →</button>
              <button>Recurring & bills →</button>
            </div>
          </div>
        )}
      </div>

      {/* Investments collapsible */}
      {assets.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card mb-6 overflow-hidden">
          <button onClick={() => setInvestOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {investOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              <span className="text-sm font-semibold text-white">📈 Investments</span>
            </div>
            <div className="flex items-center gap-2">
              <Amount value={totalCurrent} className="text-sm text-gray-300" />
              <span className={`text-xs font-medium ${investPct >= 0 ? 'text-green' : 'text-red'}`}>
                {fmtPct(investPct)}
              </span>
            </div>
          </button>
          {investOpen && (
            <div className="px-4 pb-4 border-t border-card-border">
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-card-2 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">INVESTED</p>
                  <Amount value={totalInvested} className="text-sm font-bold text-white" />
                </div>
                <div className="bg-card-2 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">CURRENT VALUE</p>
                  <Amount value={totalCurrent} className="text-sm font-bold text-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goals summary */}
      <div className="rounded-2xl border border-card-border bg-card mb-6 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">🎯 Goals</span>
          <span className="text-xs bg-card-2 rounded-full px-2 py-0.5 text-gray-400">{goals.length}</span>
        </div>
        {goals.length === 0 && (
          <p className="text-gray-500 text-xs mt-2">No goals yet. Create one from More → Goals</p>
        )}
      </div>
    </div>
  )
}
