import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { monthKey, startOfMonth } from '../../utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'

export default function Insights() {
  const { transactions } = useFinanceStore()

  const monthlyData = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i, 1)
      const mk = monthKey(d)
      const mtxs = transactions.filter((t) => monthKey(t.date) === mk)
      const income  = mtxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = mtxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      result.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), income, expense })
    }
    return result
  }, [transactions])

  const catData = useMemo(() => {
    const tmStr = startOfMonth(0)
    const monthExp = transactions.filter((t) => t.type === 'expense' && t.date >= tmStr)
    const total = monthExp.reduce((s, t) => s + Number(t.amount), 0)
    return CATEGORIES.filter((c) => c.type === 'expense').map((cat) => {
      const value = monthExp.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + Number(t.amount), 0)
      return { name: cat.name, value, color: cat.color, pct: total > 0 ? ((value / total) * 100).toFixed(0) : 0 }
    }).filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  }, [transactions])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: ₹{p.value?.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-6">
      {/* Monthly income vs expense */}
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Income vs Expense (6M)</p>
        {monthlyData.some((d) => d.income > 0 || d.expense > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="income" fill="#4CAF76" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#E05252" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
            No data yet. Add some transactions.
          </div>
        )}
      </div>

      {/* Category breakdown this month */}
      {catData.length > 0 && (
        <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">This Month by Category</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {catData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
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

      {catData.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          Add some expenses this month to see insights.
        </div>
      )}
    </div>
  )
}
