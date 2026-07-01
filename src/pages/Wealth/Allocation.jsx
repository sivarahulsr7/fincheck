import { useMemo } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import { fmt } from '../../utils/formatters'
import { ASSET_TYPES } from '../../utils/constants'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const ACCOUNT_BUCKETS = [
  { id: 'bank', name: 'Bank / Savings', color: '#06B6D4' },
  { id: 'cash', name: 'Cash',           color: '#22C55E' },
  { id: 'upi',  name: 'UPI / Wallet',   color: '#A855F7' },
]

const KNOWN_TYPES = new Set(ASSET_TYPES.map((t) => t.id))

export default function Allocation() {
  const { assets, accounts } = useFinanceStore()
  const balancesHidden = useAppStore((s) => s.balancesHidden)

  const byType = useMemo(() => {
    // 1. Group named asset types
    const rows = ASSET_TYPES.map((at) => {
      const value = assets
        .filter((a) => a.assetType === at.id)
        .reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
      return { ...at, value }
    })

    // 2. Assets with unrecognised/missing types fall into 'other'
    const otherIdx = rows.findIndex((r) => r.id === 'other')
    assets.forEach((a) => {
      if (!KNOWN_TYPES.has(a.assetType)) {
        rows[otherIdx].value += a.currentValue || a.investedAmount || 0
      }
    })

    // 3. Add account balances (positive only; credit cards are liabilities, skip)
    ACCOUNT_BUCKETS.forEach((bucket) => {
      const value = accounts
        .filter((a) => a.type === bucket.id && (a.balance || 0) > 0)
        .reduce((s, a) => s + a.balance, 0)
      if (value > 0) rows.push({ ...bucket, value })
    })

    return rows.filter((t) => t.value > 0)
  }, [assets, accounts])

  const total = byType.reduce((s, t) => s + t.value, 0)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
      <div className="bg-card-2 border border-card-border rounded-xl p-2 text-xs">
        <p style={{ color: d.payload.color }}>{d.name}</p>
        <p className="text-white">{balancesHidden ? '••••••' : fmt(d.value || 0)}</p>
        <p className="text-gray-400">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 pb-6">
      <h2 className="text-lg font-bold text-white mb-4">Allocation</h2>

      {byType.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Add assets to see allocation.
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} innerRadius={50}>
                  {byType.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Stacked bar */}
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
              {byType.map((t) => (
                <div key={t.id} style={{ width: `${(t.value / total) * 100}%`, background: t.color }} />
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-2">TOTAL: <span className="text-white font-bold">{balancesHidden ? '••••••' : fmt(total)}</span></p>

            <div className="flex flex-col gap-2">
              {byType.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm text-gray-300">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Amount value={t.value} className="text-sm text-gray-300" />
                    <span className="text-xs font-medium" style={{ color: t.color }}>
                      {total > 0 ? ((t.value / total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
