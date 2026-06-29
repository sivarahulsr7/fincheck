import { useState } from 'react'
import { Plus, Edit2, Trash2, Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { fmt, monthKey } from '../../utils/formatters'
import BottomSheet from '../../components/common/BottomSheet'
import CategoryIcon from '../../components/common/CategoryIcon'

const currentMk = monthKey(new Date())

export default function Budget() {
  const { budgets, transactions, setBudget, deleteBudget } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)

  const thisMonthStart = new Date(); thisMonthStart.setDate(1)
  const tmStr = thisMonthStart.toISOString().split('T')[0]

  const monthBudgets = budgets.filter((b) => b.monthKey === currentMk)
  const expCats = CATEGORIES.filter((c) => c.type === 'expense')

  const getSpent = (catId) =>
    transactions.filter((t) => t.type === 'expense' && t.categoryId === catId && t.date >= tmStr)
      .reduce((s, t) => s + Number(t.amount), 0)

  const handleSave = async () => {
    if (!catId || !limit || saving) return
    setSaving(true)
    const existing = editBudget || monthBudgets.find((b) => b.categoryId === catId)
    await setBudget({ id: existing?.id, categoryId: catId, monthKey: currentMk, limit: Number(limit), spent: getSpent(catId) })
    setSaving(false)
    setShowForm(false)
    setEditBudget(null)
    setCatId('')
    setLimit('')
  }

  const openEdit = (b) => {
    setEditBudget(b)
    setCatId(b.categoryId)
    setLimit(String(b.limit))
    setShowForm(true)
  }

  const totalBudget = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0)
  const totalSpent  = monthBudgets.reduce((s, b) => s + getSpent(b.categoryId), 0)

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="px-4 pt-3 pb-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card-2 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">TOTAL BUDGET</p>
          <Amount value={totalBudget} className="text-base font-bold text-white" />
        </div>
        <div className="bg-card-2 rounded-xl p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">TOTAL SPENT</p>
          <Amount value={totalSpent} className={`text-base font-bold ${totalSpent > totalBudget ? 'text-red' : 'text-green'}`} />
        </div>
      </div>

      {/* Overall progress */}
      {totalBudget > 0 && (
        <div className="bg-card rounded-xl p-3 mb-4 border border-card-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Overall spending</span>
            <span className={`text-xs font-semibold ${totalSpent > totalBudget ? 'text-red' : 'text-green'}`}>
              {Math.round((totalSpent / totalBudget) * 100)}%
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
              background: totalSpent > totalBudget ? '#E05252' : '#4CAF76'
            }} />
          </div>
        </div>
      )}

      {/* Budget list */}
      <div className="flex flex-col gap-3 mb-4">
        {monthBudgets.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-6">No budgets set for this month.</p>
        )}
        {monthBudgets.map((b) => {
          const cat = CATEGORIES.find((c) => c.id === b.categoryId)
          if (!cat) return null
          const spent = getSpent(b.categoryId)
          const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0
          const over = spent > b.limit
          return (
            <div key={b.id} className="bg-card rounded-xl p-3 border border-card-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: cat.bg }}>
                  <span style={{ color: cat.color }}><CategoryIcon icon={cat.icon} size={14} /></span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{cat.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} className="text-gray-500"><Edit2 size={13} /></button>
                      <button onClick={() => deleteBudget(b.id)} className="text-gray-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Amount value={spent} className={`text-xs ${over ? 'text-red' : 'text-gray-400'}`} />
                    <span className="text-xs text-gray-600">/ </span>
                    <Amount value={b.limit} className="text-xs text-gray-400" />
                    {over && <span className="text-[10px] text-red ml-1">OVERSPENT</span>}
                  </div>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%`, background: over ? '#E05252' : cat.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Budget button */}
      <button onClick={() => { setEditBudget(null); setCatId(''); setLimit(''); setShowForm(true) }}
        className="w-full py-3 rounded-xl border border-dashed border-green text-green text-sm font-medium flex items-center justify-center gap-2">
        <Plus size={16} /> Set Budget
      </button>

      {/* Form sheet */}
      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditBudget(null) }} title="Set Monthly Budget">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-4 gap-2">
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
          <div>
            <label className={labelCls}>Monthly Limit</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" inputMode="decimal" placeholder="0" value={limit}
                onChange={(e) => setLimit(e.target.value)} className={`${inputCls} pl-8`} />
            </div>
          </div>
          <button onClick={handleSave} disabled={!catId || !limit || saving}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${catId && limit ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
            {saving ? 'Saving...' : <><Check size={16} /> Save Budget</>}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
