import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import {
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer
} from 'recharts'

export default function NetWorthHistory() {
  const { accounts, assets, liabilities, transactions } = useFinanceStore()

  const currentAccountBal = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalAssets       = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
  const totalLiab         = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const netWorth = currentAccountBal + totalAssets - totalLiab

  // Reconstruct account balance at end of each past month by rolling back transactions.
  // Asset/liability values are held at today's prices (no historical records stored).
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthsAgo = 5 - i
      // Last day of that month
      const d = new Date()
      d.setMonth(d.getMonth() - monthsAgo + 1, 0)
      const monthEnd = d.toISOString().split('T')[0]

      // Roll back: undo income/expense that happened AFTER this month end
      const futureIncome  = transactions.filter(t => t.type === 'income'  && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const futureExpense = transactions.filter(t => t.type === 'expense' && t.date > monthEnd).reduce((s, t) => s + Number(t.amount), 0)
      const pastAccountBal = currentAccountBal - futureIncome + futureExpense

      const label = new Date(d.getFullYear(), d.getMonth(), 1)
        .toLocaleDateString('en-IN', { month: 'short' })

      return { label, value: pastAccountBal + totalAssets - totalLiab }
    })
  }, [accounts, assets, liabilities, transactions])

  const hasData = transactions.length > 0 || netWorth !== 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p className="text-gray-400 mb-0.5">{label}</p>
        <p className="text-white font-semibold">₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-6">
      <h2 className="text-lg font-bold text-white mb-1">Net Worth</h2>
      <Amount value={netWorth} className="text-2xl font-bold text-green mb-4" />

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
