import { useState } from 'react'
import { Plus, Edit2, Trash2, Target } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import Amount from '../components/common/Amount'
import { GOAL_TYPES } from '../utils/constants'
import { fmt, fmtDate } from '../utils/formatters'
import BottomSheet from '../components/common/BottomSheet'
import GoalForm from '../components/forms/GoalForm'

export default function Goals() {
  const { goals, deleteGoal, updateGoal } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [showProgress, setShowProgress] = useState(null)
  const [progressAmount, setProgressAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const getGoalType = (id) => GOAL_TYPES.find((g) => g.id === id)

  const handleAddProgress = async () => {
    if (!progressAmount || saving) return
    setSaving(true)
    const goal = goals.find((g) => g.id === showProgress)
    if (goal) {
      await updateGoal(goal.id, { currentAmount: (goal.currentAmount || 0) + Number(progressAmount) })
    }
    setSaving(false)
    setShowProgress(null)
    setProgressAmount('')
  }

  return (
    <div className="page-content px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Goals</h1>
          <p className="text-xs text-gray-500">{goals.length} goals</p>
        </div>
        <button onClick={() => { setEditGoal(null); setShowForm(true) }}
          className="w-9 h-9 rounded-xl bg-green flex items-center justify-center text-[#1a3d29]">
          <Plus size={18} />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-card-2 flex items-center justify-center">
            <Target size={28} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm text-center">No goals yet.<br />Set unlimited goals to stay on track.</p>
          <button onClick={() => setShowForm(true)} className="bg-green text-[#1a3d29] px-5 py-2.5 rounded-xl text-sm font-semibold">
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g) => {
            const gt = getGoalType(g.type)
            const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0
            const done = pct >= 100
            return (
              <div key={g.id} className="bg-card rounded-2xl border border-card-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: (gt?.color || '#4CAF76') + '22' }}>
                      <span style={{ color: gt?.color || '#4CAF76', fontSize: 18 }}>🎯</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{g.name}</p>
                      <p className="text-xs text-gray-500">{gt?.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditGoal(g); setShowForm(true) }} className="text-gray-500"><Edit2 size={13} /></button>
                    <button onClick={() => deleteGoal(g.id)} className="text-gray-500"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1">
                      <Amount value={g.currentAmount || 0} className="text-sm font-bold text-white" />
                      <span className="text-xs text-gray-500">/ </span>
                      <Amount value={g.targetAmount} className="text-xs text-gray-400" />
                    </div>
                    <span className={`text-xs font-semibold ${done ? 'text-green' : 'text-gray-400'}`}>
                      {done ? '✓ Done!' : `${pct.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{
                      width: `${pct}%`,
                      background: done ? '#4CAF76' : (gt?.color || '#4CAF76')
                    }} />
                  </div>
                </div>

                {g.targetDate && (
                  <p className="text-xs text-gray-500 mb-2">Target: {fmtDate(g.targetDate)}</p>
                )}

                {!done && (
                  <button onClick={() => { setShowProgress(g.id); setProgressAmount('') }}
                    className="text-green text-xs font-medium">+ Add progress →</button>
                )}

                {g.note && <p className="text-xs text-gray-600 mt-1 italic">{g.note}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Goal form */}
      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditGoal(null) }}
        title={editGoal ? 'Edit Goal' : 'New Goal'}>
        <GoalForm goal={editGoal} onClose={() => { setShowForm(false); setEditGoal(null) }} />
      </BottomSheet>

      {/* Progress form */}
      <BottomSheet open={!!showProgress} onClose={() => setShowProgress(null)} title="Add Progress">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input type="number" inputMode="decimal" placeholder="0" value={progressAmount}
              onChange={(e) => setProgressAmount(e.target.value)}
              className="w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 pl-8 text-white text-xl font-semibold outline-none focus:border-green" />
          </div>
          <button onClick={handleAddProgress} disabled={!progressAmount || saving}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm ${progressAmount ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
            {saving ? 'Saving...' : 'Add Progress'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
