import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useFinanceStore } from '../store/useFinanceStore'
import Amount from '../components/common/Amount'
import AppHeader from '../components/layout/AppHeader'
import BottomSheet from '../components/common/BottomSheet'
import { CATEGORIES } from '../utils/constants'
import { fmtPct, nDaysAgo, startOfMonth, toISO, fmtDate } from '../utils/formatters'
import { isSpendingExpense, isInvestmentExpense } from '../utils/txClassify'

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

export default function Overview({ onNavigate, onFabAction }) {
  const { showLiabilities, setActiveTab, setMoneySubTab, setWealthSubTab } = useAppStore()
  const { transactions, accounts, assets, liabilities, goals, recurring, getNetWorth } = useFinanceStore()
  const [cfFilter, setCfFilter] = useState('30d')
  const [mFilter, setMFilter] = useState('1M')
  const [cashflowOpen, setCashflowOpen] = useState(true)
  const [wealthOpen, setWealthOpen] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const goWealth = (sub) => { setActiveTab('wealth'); setWealthSubTab(sub) }
  const goMoney  = (sub) => { setActiveTab('money');  setMoneySubTab(sub) }

  const netWorth = getNetWorth()

  // Cashflow for top card
  const cfDays = TIME_FILTERS.find((f) => f.id === cfFilter)?.days || 30
  const since = nDaysAgo(cfDays)
  const cfTxs = transactions.filter((t) => t.date >= since)
  const cfIn  = cfTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const cfOut = cfTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Monthly cashflow section
  const months = monthsForFilter(mFilter)
  const mStart = startOfMonth(-(months - 1))
  const mTxs = transactions.filter((t) => t.date >= mStart)
  const mIncome  = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const mSpent    = mTxs.filter(isSpendingExpense).reduce((s, t) => s + Number(t.amount), 0)
  const mInvested = mTxs.filter(isInvestmentExpense).reduce((s, t) => s + Number(t.amount), 0)
  const mExpense = mSpent + mInvested // total money out
  const mOverspent = mSpent > mIncome // overspending is about consumption, not investing

  // Where it went (consumption only — investing is not spending)
  const tmStr = startOfMonth(0)
  const monthExpenses = transactions.filter((t) => isSpendingExpense(t) && t.date >= tmStr)
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
  const investedThisMonth = transactions
    .filter((t) => isInvestmentExpense(t) && t.date >= startOfMonth(0))
    .reduce((s, t) => s + Number(t.amount), 0)

  // Total liabilities
  const totalLiab = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  // Total assets = investable assets (current value) + positive account balances
  const liquidAssets = accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0)
  const assetsTotal = totalCurrent + liquidAssets

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const today = new Date().getDate()

  // Loans missing an interest rate — repayments to these over-reduce principal.
  const loansNeedingInterest = liabilities.filter((l) => l.interestRate == null)

  // Recurring items due within the next 7 days (overdue ones auto-post on load).
  const weekAhead = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return toISO(d) })()
  const upcomingRecurring = recurring
    .filter((r) => r.isActive !== false && r.nextDate && r.nextDate <= weekAhead)
    .sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || ''))

  const alertCount = loansNeedingInterest.length + upcomingRecurring.length

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Overview" actions={
        <button onClick={() => setNotifOpen(true)}
          aria-label="Notifications"
          className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400 relative">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red" />
          )}
        </button>
      } />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
      {/* Net Worth Card — assets & liabilities (not a single net figure) */}
      <div
        onClick={() => goWealth('net-worth')}
        className={`rounded-2xl border p-4 mb-3 bg-card cursor-pointer active:opacity-80 ${netWorth < 0 ? 'border-red-dim' : 'border-card-border'}`}>
        <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-3">NET WORTH · ₹ INR</p>
        <div className="flex gap-10">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">ASSETS</p>
            <Amount value={assetsTotal} className="text-2xl font-bold text-green" />
          </div>
          {showLiabilities && (
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">LIABILITIES</p>
              <Amount value={totalLiab} className="text-2xl font-bold text-red" />
            </div>
          )}
        </div>
        <p className="mt-3 text-green text-xs font-medium">View history →</p>
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
          <button onClick={() => goMoney('transactions')} className="text-left">
            <p className="text-[10px] text-gray-500 mb-0.5">In</p>
            <Amount value={cfIn} className="text-green text-sm font-semibold" />
          </button>
          <button onClick={() => goMoney('transactions')} className="text-left">
            <p className="text-[10px] text-gray-500 mb-0.5">Out</p>
            <Amount value={cfOut} className="text-red text-sm font-semibold" />
          </button>
        </div>
        <button onClick={() => goMoney('insights')} className="mt-2 text-green text-xs font-medium">View insights →</button>
      </div>

      {/* Wealth collapsible */}
      <div className="rounded-2xl border border-card-border bg-card mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setWealthOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
            {wealthOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            <span className="text-sm font-semibold text-white">⚖️ Wealth</span>
          </button>
          <div className="flex items-center gap-2">
            <Amount value={netWorth} className="text-sm text-gray-300" />
            <button onClick={() => goWealth('assets')} className="text-green text-xs font-medium ml-1">→</button>
          </div>
        </div>
        {wealthOpen && (
          <div className="px-4 pb-4 border-t border-card-border">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button onClick={() => goWealth('assets')} className="bg-card-2 rounded-xl p-3 text-left active:opacity-70">
                <p className="text-[10px] text-gray-400 mb-1">ASSETS</p>
                <Amount value={totalCurrent + accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0)} className="text-sm font-bold text-green" />
              </button>
              <button onClick={() => goWealth('liabilities')} className="bg-card-2 rounded-xl p-3 text-left active:opacity-70">
                <p className="text-[10px] text-gray-400 mb-1">LIABILITIES</p>
                <Amount value={totalLiab} className="text-sm font-bold text-red" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cashflow collapsible - detailed */}
      <div className="rounded-2xl border border-card-border bg-card mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setCashflowOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
            {cashflowOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            <span className="text-sm font-semibold text-white">⇄ Cashflow</span>
          </button>
          <div className="flex items-center gap-2">
            <Amount value={mIncome - mExpense} className={`text-sm font-semibold ${mIncome >= mExpense ? 'text-green' : 'text-red'}`} />
            <span className="text-xs bg-card-2 rounded-lg px-2 py-0.5 text-gray-400">{mFilter}</span>
            <button onClick={() => goMoney('transactions')} className="text-green text-xs font-medium ml-1">→</button>
          </div>
        </div>

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

            {mOverspent && mSpent > 0 && (
              <button onClick={() => goMoney('transactions')} className="text-red text-xs mb-3 text-left w-full">
                {mIncome > 0
                  ? `Spent ${Math.round((mSpent / mIncome) * 100)}% of income · day ${today}/${daysInMonth} →`
                  : `No income this period · day ${today}/${daysInMonth} →`}
              </button>
            )}

            {/* IN */}
            <button onClick={() => goMoney('transactions')} className="w-full rounded-xl bg-green-tint border border-green-dim p-3 mb-2 text-left active:opacity-70">
              <div className="flex items-center gap-1 mb-1">
                <ArrowDownLeft size={13} className="text-green" />
                <span className="text-[10px] font-bold tracking-widest text-green">IN</span>
              </div>
              <Amount value={mIncome} className="text-lg font-bold text-green" />
              <p className="text-[11px] text-gray-400 mt-0.5">all income</p>
            </button>

            {/* OUT — total money out, split into spent (consumption) + invested */}
            <button onClick={() => goMoney('transactions')} className="w-full rounded-xl bg-red-tint border border-red-dim p-3 mb-2 text-left active:opacity-70">
              <div className="flex items-center gap-1 mb-1">
                <ArrowUpRight size={13} className="text-red" />
                <span className="text-[10px] font-bold tracking-widest text-red">OUT</span>
              </div>
              <Amount value={mExpense} className="text-lg font-bold text-red" />
              {mInvested > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Spent <Amount value={mSpent} className="text-gray-300" /> · Invested <Amount value={mInvested} className="text-gray-300" />
                </p>
              )}
            </button>

            {/* Overspent */}
            {mOverspent && mSpent > 0 && (
              <button onClick={() => goMoney('budget')} className="w-full rounded-xl bg-red-tint border border-red-dim p-3 mb-3 text-left active:opacity-70">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle size={13} className="text-red" />
                  <span className="text-[10px] font-bold tracking-widest text-red">OVERSPENT</span>
                </div>
                <Amount value={mSpent - mIncome} className="text-base font-bold text-red" />
              </button>
            )}

            {/* Where it went */}
            {catBreakdown.length > 0 && (
              <button onClick={() => goMoney('transactions')} className="w-full rounded-xl bg-card-2 p-3 mb-2 text-left active:opacity-70">
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
              </button>
            )}

            {/* Where it came from */}
            <button onClick={() => goMoney('transactions')} className="w-full rounded-xl bg-card-2 p-3 mb-3 text-left active:opacity-70">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">WHERE IT CAME FROM</p>
              {monthIncome.length === 0 ? (
                <div className="py-2">
                  <p className="text-gray-500 text-sm">No income in this period.</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); onFabAction?.('income') }}
                    className="text-green text-xs mt-1">Add income →</button>
                </div>
              ) : (
                <Amount value={totalInc} className="text-base font-bold text-green" />
              )}
            </button>

            {/* Quick links */}
            <div className="flex gap-4 text-green text-xs font-medium flex-wrap">
              <button onClick={() => goMoney('insights')}>Insights →</button>
              <button onClick={() => goMoney('budget')}>Edit budget →</button>
              <button onClick={() => goMoney('transactions')}>Transactions →</button>
            </div>
          </div>
        )}
      </div>

      {/* Investments collapsible */}
      {assets.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setInvestOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
              {investOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              <span className="text-sm font-semibold text-white">📈 Investments</span>
            </button>
            <div className="flex items-center gap-2">
              <Amount value={totalCurrent} className="text-sm text-gray-300" />
              <span className={`text-xs font-medium ${investPct >= 0 ? 'text-green' : 'text-red'}`}>
                {fmtPct(investPct)}
              </span>
              <button onClick={() => goWealth('assets')} className="text-green text-xs font-medium ml-1">→</button>
            </div>
          </div>
          {investOpen && (
            <div className="px-4 pb-4 border-t border-card-border">
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => goWealth('assets')} className="bg-card-2 rounded-xl p-3 text-left active:opacity-70">
                  <p className="text-[10px] text-gray-400 mb-1">INVESTED</p>
                  <Amount value={totalInvested} className="text-sm font-bold text-white" />
                </button>
                <button onClick={() => goWealth('assets')} className="bg-card-2 rounded-xl p-3 text-left active:opacity-70">
                  <p className="text-[10px] text-gray-400 mb-1">CURRENT VALUE</p>
                  <Amount value={totalCurrent} className="text-sm font-bold text-white" />
                </button>
              </div>
              {investedThisMonth > 0 && (
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-xs text-gray-400">Invested this month</span>
                  <Amount value={investedThisMonth} className="text-sm font-semibold text-green" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Goals summary */}
      <button
        onClick={() => onNavigate?.('goals')}
        className="w-full rounded-2xl border border-card-border bg-card mb-6 p-4 text-left active:opacity-70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">🎯 Goals</span>
            <span className="text-xs bg-card-2 rounded-full px-2 py-0.5 text-gray-400">{goals.length}</span>
          </div>
          <span className="text-green text-xs font-medium">View all →</span>
        </div>
        {goals.length === 0 && (
          <p className="text-gray-500 text-xs mt-2">No goals yet. Tap to create one.</p>
        )}
      </button>
      </div>

      {/* Notifications */}
      <BottomSheet open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications">
        {alertCount === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">You're all caught up.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {upcomingRecurring.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500">Upcoming recurring (next 7 days)</p>
                {upcomingRecurring.map((r) => (
                  <button key={r.id}
                    onClick={() => { setNotifOpen(false); onNavigate?.('recurring') }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-2 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.description || 'Recurring'}</p>
                      <p className="text-xs text-gray-500">Due {fmtDate(r.nextDate)} →</p>
                    </div>
                    <Amount value={r.amount}
                      className={`text-sm font-semibold ${r.type === 'income' ? 'text-green' : 'text-red'}`} />
                  </button>
                ))}
              </div>
            )}
            {loansNeedingInterest.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500">
                  These loans have no interest rate — repayments over-reduce principal. Set a rate so only
                  the principal portion is deducted.
                </p>
                {loansNeedingInterest.map((l) => (
                  <button key={l.id}
                    onClick={() => { setNotifOpen(false); goWealth('liabilities') }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-2 text-left">
                    <AlertCircle size={16} className="text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{l.name}</p>
                      <p className="text-xs text-gray-500">Tap to set interest rate →</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
