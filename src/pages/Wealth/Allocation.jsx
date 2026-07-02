import { useMemo, useState } from 'react'
import { Target, Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import { fmt } from '../../utils/formatters'
import { ASSET_TYPES } from '../../utils/constants'
import BottomSheet from '../../components/common/BottomSheet'
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
  const allocationTargets = useAppStore((s) => s.allocationTargets)
  const setAllocationTargets = useAppStore((s) => s.setAllocationTargets)
  const [showTargets, setShowTargets] = useState(false)
  const [draft, setDraft] = useState({})

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
  const pctOf = (v) => total > 0 ? (v / total) * 100 : 0

  // Rebalancing hints (AST-5): compare current % vs target % for asset types.
  const rebalance = useMemo(() => {
    return ASSET_TYPES.map((at) => {
      const target = Number(allocationTargets[at.id]) || 0
      if (target <= 0) return null
      const cur = pctOf(byType.find((r) => r.id === at.id)?.value || 0)
      const diff = cur - target
      return Math.abs(diff) >= 5 ? { name: at.name, diff, over: diff > 0 } : null
    }).filter(Boolean)
  }, [allocationTargets, byType, total])

  const targetsSet = Object.values(allocationTargets).some((v) => Number(v) > 0)
  const draftTotal = Object.values(draft).reduce((s, v) => s + (Number(v) || 0), 0)

  const openTargets = () => { setDraft({ ...allocationTargets }); setShowTargets(true) }
  const saveTargets = () => {
    const clean = {}
    for (const [k, v] of Object.entries(draft)) if (Number(v) > 0) clean[k] = Number(v)
    setAllocationTargets(clean); setShowTargets(false)
  }

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Allocation</h2>
        <button onClick={openTargets} className="flex items-center gap-1 text-green text-xs font-medium">
          <Target size={14} /> {targetsSet ? 'Edit targets' : 'Set targets'}
        </button>
      </div>

      {rebalance.length > 0 && (
        <div className="bg-card rounded-xl border border-card-border p-3 mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Rebalancing</p>
          <div className="flex flex-col gap-1.5">
            {rebalance.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{r.name}</span>
                <span className={r.over ? 'text-orange-400' : 'text-blue-400'}>
                  {Math.abs(r.diff).toFixed(0)}% {r.over ? 'over target' : 'under target'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <span className="text-xs font-medium text-right" style={{ color: t.color }}>
                      {pctOf(t.value).toFixed(0)}%
                      {Number(allocationTargets[t.id]) > 0 && (
                        <span className="text-gray-500 font-normal"> / {allocationTargets[t.id]}%</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Target allocation (AST-5) */}
      <BottomSheet open={showTargets} onClose={() => setShowTargets(false)} title="Target allocation">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">Set a target % for each asset type. Rebalancing hints appear when you drift 5%+ from target.</p>
          {ASSET_TYPES.map((at) => (
            <div key={at.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: at.color }} />{at.name}
              </span>
              <div className="relative w-24">
                <input type="number" inputMode="decimal" placeholder="0" value={draft[at.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [at.id]: e.target.value })}
                  className="w-full bg-card-2 border border-card-border rounded-xl pl-3 pr-7 py-2 text-white text-sm outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
          ))}
          <div className={`text-xs text-right ${draftTotal === 100 ? 'text-green' : 'text-gray-500'}`}>Total: {draftTotal}%{draftTotal !== 100 ? ' (aim for 100%)' : ''}</div>
          <button onClick={saveTargets}
            className="w-full py-3.5 rounded-xl bg-green text-[#1a3d29] font-semibold text-sm flex items-center justify-center gap-2">
            <Check size={16} /> Save targets
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
