import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import { toISO, fmt } from '../../utils/formatters'
import {
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer
} from 'recharts'

export default function NetWorthHistory() {
  const { accounts, assets, liabilities, transactions } = useFinanceStore()
  const balancesHidden = useAppStore((s) => s.balancesHidden)

  const currentAccountBal = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalAssets       = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
  const totalLiab         = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const netWorth = currentAccountBal + totalAssets - totalLiab

  // Reconstruct net worth at the end of each of the last 6 months:
  //  - Account balances: roll back income/expense that occurred after that month
  //    (transfers net to zero across all accounts, so they are correctly ignored).
  //  - Assets/liabilities: include only those acquired by that month (via
  //    purchaseDate/startDate), held at TODAY's value since no historical prices
  //    are stored. Limitation: manual balance edits (not backed by a transaction)
  //    cannot be reconstructed — see the caption.
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthsAgo = 5 - i
      const d = new Date()
      d.setMonth(d.getMonth() - monthsAgo + 1, 0) // last day of that month
      const monthEnd = toISO(d)

      const futureIncome  = transactions.filter(t => t.type === 'income'  && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const futureExpense = transactions.filter(t => t.type === 'expense' && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const pastAccountBal = currentAccountBal - futureIncome + futureExpense

      const assetsAsOf = assets
        .filter(a => !a.purchaseDate || a.purchaseDate <= monthEnd)
        .reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
      const liabAsOf = liabilities
        .filter(l => !l.startDate || l.startDate <= monthEnd)
        .reduce((s, l) => s + (l.outstandingAmount || 0), 0)

      const label = new Date(d.getFullYear(), d.getMonth(), 1)
        .toLocaleDateString('en-IN', { month: 'short' })

      return { label, value: pastAccountBal + assetsAsOf - liabAsOf }
    })
  }, [accounts, assets, liabilities, transactions])

  const hasData = accounts.length > 0 || assets.length > 0 || liabilities.length > 0 || transactions.length > 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p className="text-gray-400 mb-0.5">{label}</p>
        <p className="text-white font-semibold">{balancesHidden ? '••••••' : fmt(payload[0]?.value || 0)}</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-6">
      <h2 className="text-lg font-bold text-white mb-1">Net Worth</h2>
      <Amount value={netWorth} className={`text-2xl font-bold mb-4 ${netWorth >= 0 ? 'text-green' : 'text-red'}`} />

      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">6-Month Trend</p>
          <p className="text-[10px] text-gray-600">Assets at today's prices</p>
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4CAF76', strokeWidth: 1 }} />
              <Line type="monotone" dataKey="value" stroke="#4CAF76" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            Add accounts, assets, and transactions to see history.
          </div>
        )}
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
    </div>
  )
}
