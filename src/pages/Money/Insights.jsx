import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { monthKey, startOfMonth, endOfMonth, todayISO } from '../../utils/formatters'
import { isSpendingExpense, isInvestmentExpense } from '../../utils/txClassify'
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'

const sumSpend = (txs) => txs.filter(isSpendingExpense).reduce((s, t) => s + Number(t.amount), 0)
const sumIncome = (txs) => txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || id

export default function Insights() {
  const { transactions, recurring } = useFinanceStore()
  const [range, setRange] = useState(6) // months in the bar chart

  const today = todayISO()
  const thisStart = startOfMonth(0)
  const thisEnd = endOfMonth(0)
  const lastStart = startOfMonth(-1)
  const lastEnd = endOfMonth(-1)

  const thisTxs = useMemo(() => transactions.filter((t) => t.date >= thisStart && t.date <= thisEnd), [transactions, thisStart, thisEnd])
  const lastTxs = useMemo(() => transactions.filter((t) => t.date >= lastStart && t.date <= lastEnd), [transactions, lastStart, lastEnd])

  const income = sumIncome(thisTxs)
  const spent = sumSpend(thisTxs)
  const invested = thisTxs.filter(isInvestmentExpense).reduce((s, t) => s + Number(t.amount), 0)
  const saved = income - spent
  const savingsRate = income > 0 ? (saved / income) * 100 : 0
  const lastIncome = sumIncome(lastTxs)
  const lastSpent = sumSpend(lastTxs)
  const lastSavingsRate = lastIncome > 0 ? ((lastIncome - lastSpent) / lastIncome) * 100 : 0

  // Bar chart over the selected range
  const monthlyData = useMemo(() => {
    const result = []
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i, 1)
      const mk = monthKey(d)
      const mtxs = transactions.filter((t) => monthKey(t.date) === mk)
      result.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        income: sumIncome(mtxs), expense: sumSpend(mtxs),
      })
    }
    return result
  }, [transactions, range])

  // Category pie (this month, consumption)
  const catData = useMemo(() => {
    const total = spent
    return CATEGORIES.filter((c) => c.type === 'expense').map((cat) => {
      const value = thisTxs.filter((t) => isSpendingExpense(t) && t.categoryId === cat.id).reduce((s, t) => s + Number(t.amount), 0)
      return { name: cat.name, value, color: cat.color, pct: total > 0 ? ((value / total) * 100).toFixed(0) : 0 }
    }).filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  }, [thisTxs, spent])

  // Month-over-month movers by category (INS-2)
  const movers = useMemo(() => {
    const byCat = (txs) => {
      const m = {}
      txs.filter(isSpendingExpense).forEach((t) => { m[t.categoryId] = (m[t.categoryId] || 0) + Number(t.amount) })
      return m
    }
    const a = byCat(thisTxs), b = byCat(lastTxs)
    const ids = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...ids].map((id) => ({ id, now: a[id] || 0, prev: b[id] || 0, delta: (a[id] || 0) - (b[id] || 0) }))
      .filter((r) => Math.abs(r.delta) > 0)
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 5)
  }, [thisTxs, lastTxs])

  // Top merchants / descriptions this month (INS-3)
  const topMerchants = useMemo(() => {
    const m = {}
    thisTxs.filter(isSpendingExpense).forEach((t) => {
      const key = (t.description || catName(t.categoryId) || 'Other').trim()
      m[key] = (m[key] || 0) + Number(t.amount)
    })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [thisTxs])

  // Month-end forecast (INS-4): spent so far + recurring expenses still due this month
  const forecast = useMemo(() => {
    const upcoming = recurring
      .filter((r) => r.isActive !== false && r.type === 'expense' && r.categoryId !== 'investment'
        && r.nextDate && r.nextDate > today && r.nextDate <= thisEnd)
      .reduce((s, r) => s + Number(r.amount || 0), 0)
    return { projected: spent + upcoming, upcoming }
  }, [recurring, spent, today, thisEnd])

  // This calendar year totals (INS-5)
  const year = new Date().getFullYear()
  const yearTxs = useMemo(() => transactions.filter((t) => t.date?.startsWith(String(year))), [transactions, year])
  const yr = {
    income: sumIncome(yearTxs),
    spent: sumSpend(yearTxs),
    invested: yearTxs.filter(isInvestmentExpense).reduce((s, t) => s + Number(t.amount), 0),
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p) => <p key={p.name} style={{ color: p.color }}>{p.name}: ₹{p.value?.toLocaleString('en-IN')}</p>)}
      </div>
    )
  }

  const hasData = transactions.length > 0

  return (
    <div className="px-4 pt-3 pb-6">
      {/* Savings rate (INS-1) */}
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Savings rate · this month</p>
          {lastIncome > 0 && (
            <span className={`text-[11px] font-medium ${savingsRate >= lastSavingsRate ? 'text-green' : 'text-red'}`}>
              {savingsRate >= lastSavingsRate ? '▲' : '▼'} {Math.abs(savingsRate - lastSavingsRate).toFixed(0)}pts vs last
            </span>
          )}
        </div>
        <p className={`text-3xl font-bold ${savingsRate >= 0 ? 'text-green' : 'text-red'}`}>{savingsRate.toFixed(0)}%</p>
        <div className="flex gap-6 mt-3">
          <div><p className="text-[10px] text-gray-500">INCOME</p><Amount value={income} className="text-sm font-semibold text-white" /></div>
          <div><p className="text-[10px] text-gray-500">SPENT</p><Amount value={spent} className="text-sm font-semibold text-white" /></div>
          <div><p className="text-[10px] text-gray-500">SAVED</p><Amount value={saved} className={`text-sm font-semibold ${saved >= 0 ? 'text-green' : 'text-red'}`} /></div>
          {invested > 0 && <div><p className="text-[10px] text-gray-500">INVESTED</p><Amount value={invested} className="text-sm font-semibold text-green" /></div>}
        </div>
      </div>

      {/* Month-end forecast (INS-4) */}
      {forecast.upcoming > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Projected spend by month-end</p>
          <Amount value={forecast.projected} className="text-2xl font-bold text-white" />
          <p className="text-[11px] text-gray-500 mt-1">
            <Amount value={spent} className="text-gray-400" /> so far + <Amount value={forecast.upcoming} className="text-gray-400" /> from recurring still due
          </p>
        </div>
      )}

      {/* Income vs expense bars + range toggle */}
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Income vs Spend</p>
          <div className="flex gap-1">
            {[6, 12].map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium ${range === r ? 'bg-card-2 text-white' : 'text-gray-500'}`}>
                {r}M
              </button>
            ))}
          </div>
        </div>
        {monthlyData.some((d) => d.income > 0 || d.expense > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barGap={2} barCategoryGap="25%">
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="income" fill="#4CAF76" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#E05252" radius={[4, 4, 0, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data yet.</div>
        )}
      </div>

      {/* Biggest movers vs last month (INS-2) */}
      {movers.length > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Biggest changes vs last month</p>
          <div className="flex flex-col gap-2.5">
            {movers.map((m) => {
              const up = m.delta > 0
              const pct = m.prev > 0 ? Math.round((m.delta / m.prev) * 100) : null
              return (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {up ? <TrendingUp size={14} className="text-red" /> : <TrendingDown size={14} className="text-green" />}
                    <span className="text-sm text-gray-300">{catName(m.id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Amount value={Math.abs(m.delta)} className={`text-xs ${up ? 'text-red' : 'text-green'}`} showSign={false} />
                    <span className={`text-[11px] ${up ? 'text-red' : 'text-green'}`}>
                      {up ? '+' : '−'}{pct != null ? `${Math.abs(pct)}%` : 'new'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category breakdown this month */}
      {catData.length > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">This Month by Category</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {catData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {catData.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                  <span className="text-xs text-gray-300">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Amount value={cat.value} className="text-xs text-gray-400" />
                  <span className="text-xs text-gray-500">{cat.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top merchants (INS-3) */}
      {topMerchants.length > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Top spends this month</p>
          <div className="flex flex-col gap-2">
            {topMerchants.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate mr-3">{i + 1}. {m.name}</span>
                <Amount value={m.value} className="text-xs text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Year summary (INS-5) */}
      {yearTxs.length > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{year} so far</p>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[10px] text-gray-500">INCOME</p><Amount value={yr.income} className="text-base font-bold text-green" /></div>
            <div><p className="text-[10px] text-gray-500">SPENT</p><Amount value={yr.spent} className="text-base font-bold text-red" /></div>
            <div><p className="text-[10px] text-gray-500">SAVED</p><Amount value={yr.income - yr.spent} className={`text-base font-bold ${yr.income - yr.spent >= 0 ? 'text-green' : 'text-red'}`} /></div>
            {yr.invested > 0 && <div><p className="text-[10px] text-gray-500">INVESTED</p><Amount value={yr.invested} className="text-base font-bold text-white" /></div>}
          </div>
        </div>
      )}

      {!hasData && (
        <div className="text-center py-12 text-gray-500 text-sm">Add transactions to see insights.</div>
      )}
    </div>
  )
}
