import { useMemo, useState } from 'react'
import { Target, Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import BottomSheet from '../../components/common/BottomSheet'
import DatePicker from '../../components/common/DatePicker'
import { toISO, fmt, fmtDate } from '../../utils/formatters'
import {
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const shortMonth = (mk) => {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

export default function NetWorthHistory() {
  const { accounts, assets, liabilities, transactions, snapshots } = useFinanceStore()
  const balancesHidden = useAppStore((s) => s.balancesHidden)
  const netWorthGoal = useAppStore((s) => s.netWorthGoal)
  const setNetWorthGoal = useAppStore((s) => s.setNetWorthGoal)

  const [view, setView] = useState('networth') // 'networth' | 'al'
  const [goalOpen, setGoalOpen] = useState(false)
  const [gTarget, setGTarget] = useState(netWorthGoal?.target ? String(netWorthGoal.target) : '')
  const [gDate, setGDate] = useState(netWorthGoal?.date || '')

  const currentAccountBal = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalAssets = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
  const liquid = accounts.reduce((s, a) => s + (a.balance > 0 ? a.balance : 0), 0)
  const totalLiab = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const netWorth = currentAccountBal + totalAssets - totalLiab

  const realSnaps = useMemo(
    () => [...snapshots].sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '')).slice(-12),
    [snapshots])
  const useReal = realSnaps.length >= 2

  // Real snapshot series, or reconstructed fallback for users with no history yet.
  const chartData = useMemo(() => {
    if (useReal) {
      return realSnaps.map((s) => ({ label: shortMonth(s.monthKey), value: s.netWorth, assets: s.assets, liabilities: s.liabilities }))
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i) + 1, 0)
      const monthEnd = toISO(d)
      const futureIncome = transactions.filter((t) => t.type === 'income' && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const futureExpense = transactions.filter((t) => t.type === 'expense' && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const pastAccountBal = currentAccountBal - futureIncome + futureExpense
      const assetsAsOf = assets.filter((a) => !a.purchaseDate || a.purchaseDate <= monthEnd).reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
      const liabAsOf = liabilities.filter((l) => !l.startDate || l.startDate <= monthEnd).reduce((s, l) => s + (l.outstandingAmount || 0), 0)
      const liquidAsOf = assetsAsOf // approximation for the fallback A/L view
      return { label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-IN', { month: 'short' }),
        value: pastAccountBal + assetsAsOf - liabAsOf, assets: Math.max(0, pastAccountBal) + liquidAsOf, liabilities: liabAsOf }
    })
  }, [useReal, realSnaps, accounts, assets, liabilities, transactions, currentAccountBal])

  // Goal trajectory (NW-2): monthly growth from real snapshots → projected date.
  const trajectory = useMemo(() => {
    if (!netWorthGoal?.target) return null
    const target = Number(netWorthGoal.target)
    const progress = target > 0 ? Math.min(100, (netWorth / target) * 100) : 0
    let projected = null, onTrack = null
    if (useReal) {
      const first = realSnaps[0], last = realSnaps[realSnaps.length - 1]
      const months = Math.max(1, realSnaps.length - 1)
      const growth = (last.netWorth - first.netWorth) / months
      if (growth > 0 && netWorth < target) {
        const monthsLeft = Math.ceil((target - netWorth) / growth)
        const d = new Date(); d.setMonth(d.getMonth() + monthsLeft, 1)
        projected = toISO(d)
        if (netWorthGoal.date) onTrack = projected <= netWorthGoal.date
      } else if (netWorth >= target) {
        onTrack = true
      }
    }
    return { target, progress, projected, onTrack, monthlyGrowth: useReal ? (realSnaps[realSnaps.length - 1].netWorth - realSnaps[0].netWorth) / Math.max(1, realSnaps.length - 1) : null }
  }, [netWorthGoal, netWorth, useReal, realSnaps])

  const hasData = accounts.length > 0 || assets.length > 0 || liabilities.length > 0 || transactions.length > 0

  const saveGoal = () => {
    if (!(Number(gTarget) > 0)) return
    setNetWorthGoal({ target: Number(gTarget), date: gDate || null })
    setGoalOpen(false)
  }

  const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p className="text-gray-400 mb-0.5">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {balancesHidden ? '••••' : fmt(p.value || 0)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-6">
      <h2 className="text-lg font-bold text-white mb-1">Net Worth</h2>
      <Amount value={netWorth} className={`text-2xl font-bold mb-4 ${netWorth >= 0 ? 'text-green' : 'text-red'}`} />

      {/* Goal (NW-2) */}
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        {netWorthGoal?.target ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-green" />
                <span className="text-sm text-white">Goal: <Amount value={netWorthGoal.target} className="font-semibold" /></span>
              </div>
              <button onClick={() => setGoalOpen(true)} className="text-green text-xs font-medium">Edit</button>
            </div>
            <div className="bar-track mb-2"><div className="bar-fill bg-green" style={{ width: `${trajectory?.progress || 0}%` }} /></div>
            <p className="text-[11px] text-gray-400">
              {Math.round(trajectory?.progress || 0)}% there
              {netWorthGoal.date && <> · target {fmtDate(netWorthGoal.date)}</>}
            </p>
            {trajectory?.projected ? (
              <p className={`text-[11px] mt-1 ${trajectory.onTrack === false ? 'text-orange-400' : 'text-green'}`}>
                At recent pace, reaching it around {fmtDate(trajectory.projected)}
                {trajectory.onTrack === false ? ' — behind target' : trajectory.onTrack ? ' — on track' : ''}
              </p>
            ) : (
              <p className="text-[11px] text-gray-500 mt-1">
                {trajectory && netWorth >= trajectory.target ? '🎉 Goal reached!' : 'Keep tracking a couple of months to project a date.'}
              </p>
            )}
          </>
        ) : (
          <button onClick={() => setGoalOpen(true)} className="flex items-center gap-2 text-green text-sm font-medium">
            <Target size={15} /> Set a net-worth goal
          </button>
        )}
      </div>

      {/* Trend */}
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {[['networth', 'Net worth'], ['al', 'Assets vs Liabilities']].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium ${view === v ? 'bg-card-2 text-white' : 'text-gray-500'}`}>{lbl}</button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600">{useReal ? 'Recorded monthly' : 'Estimated'}</p>
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={chartData}>
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ stroke: '#4CAF76', strokeWidth: 1 }} />
              {view === 'networth' ? (
                <Line type="monotone" dataKey="value" name="Net worth" stroke="#4CAF76" strokeWidth={2} dot={false} />
              ) : (
                <>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="assets" name="Assets" stroke="#4CAF76" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="#E05252" strokeWidth={2} dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Add accounts, assets, and transactions to see history.</div>
        )}
        {!useReal && <p className="text-[10px] text-gray-600 mt-2">Estimated from transactions. A real monthly value is recorded each time you open the app — the trend becomes exact over time.</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">ACCOUNTS</p>
          <Amount value={currentAccountBal} className="text-sm font-bold text-white" />
        </div>
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">ASSETS</p>
          <Amount value={totalAssets} className="text-sm font-bold text-green" />
        </div>
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">LIABILITIES</p>
          <Amount value={totalLiab} className="text-sm font-bold text-red" />
        </div>
      </div>

      {/* Goal sheet */}
      <BottomSheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Net-worth goal">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block">Target amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" inputMode="decimal" placeholder="e.g. 10000000" value={gTarget}
                onChange={(e) => setGTarget(e.target.value)}
                className="w-full bg-card-2 border border-card-border rounded-xl pl-8 pr-4 py-3 text-white text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block">Target date (optional)</label>
            <DatePicker value={gDate} onChange={setGDate} />
          </div>
          <div className="flex gap-3">
            {netWorthGoal?.target && (
              <button onClick={() => { setNetWorthGoal(null); setGoalOpen(false) }}
                className="flex-1 py-3 rounded-xl bg-card-2 text-red font-medium text-sm">Remove</button>
            )}
            <button onClick={saveGoal} disabled={!(Number(gTarget) > 0)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${Number(gTarget) > 0 ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
              <Check size={16} /> Save
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
