import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { monthKey } from '../../utils/formatters'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export default function NetWorthHistory() {
  const { accounts, assets, liabilities } = useFinanceStore()

  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0)
    + assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
    - liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  // Simulated historical data based on current net worth
  const chartData = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i, 1)
      const factor = 1 - (i * 0.03) // simple approximation
      result.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        value: Math.max(0, netWorth * factor),
      })
    }
    return result
  }, [netWorth])

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
        <p className="text-xs text-gray-400 mb-3">6-Month Trend</p>
        {netWorth !== 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4CAF76', strokeWidth: 1 }} />
              <Line type="monotone" dataKey="value" stroke="#4CAF76" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            Add accounts, assets, and liabilities to see history.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">ACCOUNTS</p>
          <Amount value={accounts.reduce((s, a) => s + (a.balance || 0), 0)} className="text-sm font-bold text-white" />
        </div>
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">ASSETS</p>
          <Amount value={assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)} className="text-sm font-bold text-green" />
        </div>
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">LIABILITIES</p>
          <Amount value={liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)} className="text-sm font-bold text-red" />
        </div>
      </div>
    </div>
  )
}
