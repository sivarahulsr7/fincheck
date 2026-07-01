import { useState } from 'react'
import { Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { GOAL_TYPES } from '../../utils/constants'
import DatePicker from '../common/DatePicker'

export default function GoalForm({ goal, onClose }) {
  const { addGoal, updateGoal } = useFinanceStore()
  const [name, setName] = useState(goal?.name || '')
  const [type, setType] = useState(goal?.type || 'savings')
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount || '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate || '')
  const [note, setNote] = useState(goal?.note || '')
  const [saving, setSaving] = useState(false)

  const valid = name && targetAmount && Number(targetAmount) > 0

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const data = { name, type, targetAmount: Number(targetAmount), targetDate, note }
      if (goal?.id) await updateGoal(goal.id, data)
      else await addGoal(data)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green transition-colors'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Goal Type</label>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_TYPES.map((gt) => (
            <button key={gt.id} onClick={() => setType(gt.id)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${type === gt.id ? 'border-green bg-green-tint text-green' : 'border-card-border bg-card-2 text-gray-400'}`}>
              {gt.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Goal Name</label>
        <input type="text" placeholder="e.g. Emergency Fund" value={name}
          onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Target Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="0" value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Target Date (optional)</label>
        <DatePicker value={targetDate} onChange={setTargetDate} />
      </div>

      <div>
        <label className={labelCls}>Note (optional)</label>
        <textarea rows={2} placeholder="Why this goal?" value={note}
          onChange={(e) => setNote(e.target.value)} className={`${inputCls} resize-none`} />
      </div>

      <button onClick={handleSave} disabled={!valid || saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${valid ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
        {saving ? 'Saving...' : <><Check size={16} /> {goal?.id ? 'Update' : 'Create'} Goal</>}
      </button>
    </div>
  )
}
