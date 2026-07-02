import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Check, ChevronLeft, ChevronRight, AlertTriangle, Wand2 } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { monthKey, toISO } from '../../utils/formatters'
import { isSpendingExpense } from '../../utils/txClassify'
import { effectiveLimit, budgetStatus, OVERALL } from '../../utils/budgetMath'
import BottomSheet from '../../components/common/BottomSheet'
import CategoryIcon from '../../components/common/CategoryIcon'

const monthRange = (offset) => {
  const s = new Date(); s.setMonth(s.getMonth() + offset, 1)
  const e = new Date(); e.setMonth(e.getMonth() + offset + 1, 0)
  return { mk: monthKey(s), start: toISO(s), end: toISO(e), label: s.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
}

// Consumption (excl. investment) per category within a date range.
const spentMap = (txs, start, end) => {
  const m = {}
  for (const t of txs) {
    if (!isSpendingExpense(t) || t.date < start || t.date > end) continue
    m[t.categoryId] = (m[t.categoryId] || 0) + Number(t.amount || 0)
  }
  return m
}
const incomeIn = (txs, start, end) =>
  txs.filter((t) => t.type === 'income' && t.date >= start && t.date <= end).reduce((s, t) => s + Number(t.amount), 0)

export default function Budget() {
  const { budgets, transactions, setBudget, deleteBudget } = useFinanceStore()
  const [monthOffset, setMonthOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [catId, setCatId] = useState('')
  const [mode, setMode] = useState('amount') // 'amount' | 'percent'
  const [limit, setLimit] = useState('')
  const [pct, setPct] = useState('')
  const [rollover, setRollover] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const cur = useMemo(() => monthRange(monthOffset), [monthOffset])
  const prev = useMemo(() => monthRange(monthOffset - 1), [monthOffset])

  const spent = useMemo(() => spentMap(transactions, cur.start, cur.end), [transactions, cur])
  const prevSpent = useMemo(() => spentMap(transactions, prev.start, prev.end), [transactions, prev])
  const income = useMemo(() => incomeIn(transactions, cur.start, cur.end), [transactions, cur])
  const prevIncome = useMemo(() => incomeIn(transactions, prev.start, prev.end), [transactions, prev])

  const monthBudgets = budgets.filter((b) => b.monthKey === cur.mk)
  const prevBudgets = budgets.filter((b) => b.monthKey === prev.mk)
  const expCats = CATEGORIES.filter((c) => c.type === 'expense')

  const getSpent = (cId) => cId === OVERALL
    ? Object.values(spent).reduce((s, v) => s + v, 0)
    : (spent[cId] || 0)
  const getPrevSpent = (cId) => cId === OVERALL
    ? Object.values(prevSpent).reduce((s, v) => s + v, 0)
    : (prevSpent[cId] || 0)

  // Carry-over from last month (for rollover budgets).
  const carryFor = (b) => {
    const pb = prevBudgets.find((x) => x.categoryId === b.categoryId)
    if (!pb) return 0
    return effectiveLimit(pb, { income: prevIncome }) - getPrevSpent(b.categoryId)
  }
  const limitFor = (b) => effectiveLimit(b, { income, carry: carryFor(b) })

  const overall = monthBudgets.find((b) => b.categoryId === OVERALL)
  const catBudgets = monthBudgets.filter((b) => b.categoryId !== OVERALL)
  const totalBudget = catBudgets.reduce((s, b) => s + limitFor(b), 0)
  const totalSpent = getSpent(OVERALL) // all consumption this month
  const nearOrOver = catBudgets.filter((b) => { const st = budgetStatus(getSpent(b.categoryId), limitFor(b)); return st.near || st.over })

  const resetForm = () => { setEditBudget(null); setCatId(''); setMode('amount'); setLimit(''); setPct(''); setRollover(false) }

  const handleSave = async () => {
    const ok = mode === 'percent' ? Number(pct) > 0 : Number(limit) > 0
    if (!catId || !ok || saving) return
    setSaving(true)
    const existing = editBudget || monthBudgets.find((b) => b.categoryId === catId)
    await setBudget({
      id: existing?.id, categoryId: catId, monthKey: cur.mk,
      limit: mode === 'amount' ? Number(limit) : 0,
      pctOfIncome: mode === 'percent' ? Number(pct) : null,
      rollover,
    })
    setSaving(false); setShowForm(false); resetForm()
  }

  const openEdit = (b) => {
    setEditBudget(b); setCatId(b.categoryId)
    setMode(b.pctOfIncome ? 'percent' : 'amount')
    setLimit(b.limit ? String(b.limit) : ''); setPct(b.pctOfIncome ? String(b.pctOfIncome) : '')
    setRollover(!!b.rollover); setShowForm(true)
  }

  // BUD-4 templates
  const copyLastMonth = async () => {
    for (const b of prevBudgets) {
      if (monthBudgets.some((x) => x.categoryId === b.categoryId)) continue
      await setBudget({ categoryId: b.categoryId, monthKey: cur.mk, limit: b.limit || 0, pctOfIncome: b.pctOfIncome ?? null, rollover: !!b.rollover })
    }
    setShowTemplates(false)
  }
  const fromAverage = async () => {
    // 3-month average consumption per category → suggested limit.
    const months = [monthRange(monthOffset - 1), monthRange(monthOffset - 2), monthRange(monthOffset - 3)]
    const avg = {}
    for (const c of expCats) {
      const total = months.reduce((s, m) => s + (spentMap(transactions, m.start, m.end)[c.id] || 0), 0)
      const a = Math.round(total / 3)
      if (a > 0) avg[c.id] = a
    }
    for (const [cId, a] of Object.entries(avg)) {
      if (monthBudgets.some((x) => x.categoryId === cId)) continue
      await setBudget({ categoryId: cId, monthKey: cur.mk, limit: a, pctOfIncome: null, rollover: false })
    }
    setShowTemplates(false)
  }

  // BUD-5 trend: last 6 months budgeted vs spent.
  const trend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const m = monthRange(monthOffset - 5 + i)
    const mb = budgets.filter((b) => b.monthKey === m.mk && b.categoryId !== OVERALL)
    const sm = spentMap(transactions, m.start, m.end)
    const inc = incomeIn(transactions, m.start, m.end)
    const budgeted = mb.reduce((s, b) => s + effectiveLimit(b, { income: inc }), 0)
    const spentT = mb.reduce((s, b) => s + (sm[b.categoryId] || 0), 0)
    return { label: m.label.slice(0, 3), budgeted, spent: spentT }
  }), [budgets, transactions, monthOffset])

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'
  const catName = (id) => id === OVERALL ? 'Overall' : (CATEGORIES.find((c) => c.id === id)?.name || id)

  const overallLimit = overall ? limitFor(overall) : 0
  const overallStatus = budgetStatus(totalSpent, overall ? overallLimit : totalBudget)

  return (
    <div className="px-4 pt-3 pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400 active:text-white"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{cur.label}</p>
          {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} className="text-[10px] text-green">Back to current</button>}
        </div>
        <button onClick={() => setMonthOffset((o) => o + 1)} className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400 active:text-white"><ChevronRight size={18} /></button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card-2 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{overall ? 'OVERALL BUDGET' : 'TOTAL BUDGET'}</p>
          <Amount value={overall ? overallLimit : totalBudget} className="text-base font-bold text-white" />
        </div>
        <div className="bg-card-2 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SPENT</p>
          <Amount value={totalSpent} className={`text-base font-bold ${overallStatus.over ? 'text-red' : 'text-green'}`} />
        </div>
      </div>

      {/* Overall progress */}
      {(overall ? overallLimit : totalBudget) > 0 && (
        <div className="bg-card rounded-xl p-3 mb-4 border border-card-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">{overall ? 'Overall budget' : 'Across category budgets'}</span>
            <span className={`text-xs font-semibold ${overallStatus.over ? 'text-red' : 'text-green'}`}>{Math.round(overallStatus.pct)}%</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.min(overallStatus.pct, 100)}%`, background: overallStatus.over ? '#E05252' : '#4CAF76' }} />
          </div>
        </div>
      )}

      {/* BUD-1 near-limit / over alerts */}
      {nearOrOver.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={15} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-orange-300 text-xs leading-relaxed">
            {nearOrOver.map((b) => catName(b.categoryId)).join(', ')} {nearOrOver.length === 1 ? 'is' : 'are'} at or near the limit.
          </p>
        </div>
      )}

      {/* BUD-5 trend */}
      {trend.some((t) => t.budgeted > 0 || t.spent > 0) && (
        <div className="bg-card rounded-xl p-3 mb-4 border border-card-border">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Budget vs spent (6M)</p>
          <div className="flex items-end justify-between gap-2 h-20">
            {trend.map((t, i) => {
              const max = Math.max(...trend.map((x) => Math.max(x.budgeted, x.spent)), 1)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5 h-16">
                    <div className="w-1/2 bg-gray-600 rounded-t" style={{ height: `${(t.budgeted / max) * 100}%` }} />
                    <div className={`w-1/2 rounded-t ${t.spent > t.budgeted && t.budgeted > 0 ? 'bg-red' : 'bg-green'}`} style={{ height: `${(t.spent / max) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500">{t.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-600 rounded-sm" /> Budget</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green rounded-sm" /> Spent</span>
          </div>
        </div>
      )}

      {/* Budget list */}
      <div className="flex flex-col gap-3 mb-4">
        {monthBudgets.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No budgets for {cur.label}.</p>}
        {[...(overall ? [overall] : []), ...catBudgets].map((b) => {
          const isOverall = b.categoryId === OVERALL
          const cat = CATEGORIES.find((c) => c.id === b.categoryId)
          if (!isOverall && !cat) return null
          const lim = limitFor(b)
          const sp = getSpent(b.categoryId)
          const st = budgetStatus(sp, lim)
          const color = isOverall ? '#4CAF76' : cat.color
          return (
            <div key={b.id} className="bg-card rounded-xl p-3 border border-card-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isOverall ? '#052e16' : cat.bg }}>
                  <span style={{ color }}><CategoryIcon icon={isOverall ? 'pie-chart' : cat.icon} size={14} /></span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {catName(b.categoryId)}
                      {b.pctOfIncome ? <span className="text-[10px] text-gray-500 ml-1">{b.pctOfIncome}% inc</span> : null}
                      {b.rollover ? <span className="text-[10px] text-blue-400 ml-1">↻</span> : null}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} className="text-gray-500"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteTarget(b)} className="text-gray-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Amount value={sp} className={`text-xs ${st.over ? 'text-red' : 'text-gray-400'}`} />
                    <span className="text-xs text-gray-600">/ </span>
                    <Amount value={lim} className="text-xs text-gray-400" />
                    {st.over && <span className="text-[10px] text-red ml-1">OVERSPENT</span>}
                    {st.near && <span className="text-[10px] text-orange-400 ml-1">NEAR LIMIT</span>}
                  </div>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(st.pct, 100)}%`, background: st.over ? '#E05252' : st.near ? '#F59E0B' : color }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex-1 py-3 rounded-xl border border-dashed border-green text-green text-sm font-medium flex items-center justify-center gap-2">
          <Plus size={16} /> Set Budget
        </button>
        <button onClick={() => setShowTemplates(true)}
          className="px-4 py-3 rounded-xl border border-dashed border-card-border text-gray-400 text-sm font-medium flex items-center justify-center gap-1">
          <Wand2 size={15} /> Auto
        </button>
      </div>

      {/* Form sheet */}
      <BottomSheet open={showForm} onClose={() => { setShowForm(false); resetForm() }} title={editBudget ? 'Edit Budget' : 'Set Budget'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => setCatId(OVERALL)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${catId === OVERALL ? 'border-green bg-green-tint' : 'border-card-border bg-card-2'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#052e16' }}>
                  <span style={{ color: '#4CAF76' }}><CategoryIcon icon="pie-chart" size={14} /></span>
                </div>
                <span className="text-[9px] text-gray-300 text-center leading-tight">Overall</span>
              </button>
              {expCats.map((cat) => (
                <button key={cat.id} onClick={() => setCatId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${catId === cat.id ? 'border-green bg-green-tint' : 'border-card-border bg-card-2'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: cat.bg }}>
                    <span style={{ color: cat.color }}><CategoryIcon icon={cat.icon} size={14} /></span>
                  </div>
                  <span className="text-[9px] text-gray-300 text-center leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-card-2 rounded-xl">
            {[['amount', 'Fixed ₹'], ['percent', '% of income']].map(([m, lbl]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${mode === m ? 'bg-green text-[#1a3d29]' : 'text-gray-400'}`}>{lbl}</button>
            ))}
          </div>

          {mode === 'amount' ? (
            <div>
              <label className={labelCls}>Monthly Limit</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" inputMode="decimal" placeholder="0" value={limit}
                  onChange={(e) => setLimit(e.target.value)} className={`${inputCls} pl-8`} />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Percent of income</label>
              <div className="relative">
                <input type="number" inputMode="decimal" placeholder="e.g. 30" value={pct}
                  onChange={(e) => setPct(e.target.value)} className={`${inputCls} pr-8`} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">≈ <Amount value={Math.round(income * (Number(pct) || 0) / 100)} className="text-gray-400" /> at this month's income</p>
            </div>
          )}

          <button onClick={() => setRollover((r) => !r)} className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-white">Roll over unspent</p>
              <p className="text-[11px] text-gray-500">Add last month's leftover to this month</p>
            </div>
            <div className={`w-11 h-6 rounded-full relative ${rollover ? 'bg-green' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${rollover ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </button>

          <button onClick={handleSave} disabled={!catId || (mode === 'percent' ? !(Number(pct) > 0) : !(Number(limit) > 0)) || saving}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${catId && (mode === 'percent' ? Number(pct) > 0 : Number(limit) > 0) ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
            {saving ? 'Saving...' : <><Check size={16} /> Save Budget</>}
          </button>
        </div>
      </BottomSheet>

      {/* BUD-4 templates */}
      <BottomSheet open={showTemplates} onClose={() => setShowTemplates(false)} title="Auto-set budgets">
        <div className="flex flex-col gap-3">
          <button onClick={copyLastMonth} className="px-4 py-3 rounded-xl bg-card-2 text-left">
            <p className="text-sm text-white">Copy last month</p>
            <p className="text-[11px] text-gray-500">Reuse {prev.label}'s budgets for categories not yet set</p>
          </button>
          <button onClick={fromAverage} className="px-4 py-3 rounded-xl bg-card-2 text-left">
            <p className="text-sm text-white">Use 3-month average</p>
            <p className="text-[11px] text-gray-500">Set each category to its recent average spend</p>
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      <BottomSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Budget?">
        <p className="text-gray-400 text-sm mb-5">Remove the {catName(deleteTarget?.categoryId)} budget? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium">Cancel</button>
          <button onClick={() => { deleteBudget(deleteTarget.id); setDeleteTarget(null) }} className="flex-1 py-3 rounded-xl bg-red text-white font-semibold">Delete</button>
        </div>
      </BottomSheet>
    </div>
  )
}
