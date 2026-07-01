import { useState } from 'react'
import { Plus, Edit2, Trash2, Pause, Play, ArrowLeftRight, Repeat } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import Amount from '../components/common/Amount'
import CategoryIcon from '../components/common/CategoryIcon'
import BottomSheet from '../components/common/BottomSheet'
import RecurringForm from '../components/forms/RecurringForm'
import { CATEGORIES } from '../utils/constants'
import { fmtDate } from '../utils/formatters'

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

export default function Recurring() {
  const { recurring, accounts, updateRecurring, deleteRecurring } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const getCat = (id) => CATEGORIES.find((c) => c.id === id)
  const getAcc = (id) => accounts.find((a) => a.id === id)

  // Soonest next date first.
  const items = [...recurring].sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || ''))
  const monthlyOut = recurring
    .filter((r) => r.isActive !== false && r.type === 'expense' && r.frequency === 'monthly')
    .reduce((s, r) => s + Number(r.amount || 0), 0)
  const monthlyIn = recurring
    .filter((r) => r.isActive !== false && r.type === 'income' && r.frequency === 'monthly')
    .reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div className="px-4 pt-3 pb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Recurring</h2>
          <p className="text-xs text-gray-500">{recurring.length} scheduled</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="w-9 h-9 rounded-xl bg-green flex items-center justify-center text-[#1a3d29]">
          <Plus size={18} />
        </button>
      </div>

      {(monthlyIn > 0 || monthlyOut > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card rounded-xl border border-card-border p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">MONTHLY IN</p>
            <Amount value={monthlyIn} className="text-base font-bold text-green" />
          </div>
          <div className="bg-card rounded-xl border border-card-border p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">MONTHLY OUT</p>
            <Amount value={monthlyOut} className="text-base font-bold text-red" />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Repeat size={28} className="text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recurring items yet.</p>
          <button onClick={() => setShowForm(true)} className="text-green text-xs mt-2">Add salary, rent, EMI, SIP →</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => {
            const cat = getCat(r.categoryId)
            const paused = r.isActive === false
            return (
              <div key={r.id} className={`bg-card rounded-xl border border-card-border p-4 ${paused ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: r.type === 'transfer' ? '#1e3a5f' : (cat?.bg || '#1f2937') }}>
                    {r.type === 'transfer'
                      ? <ArrowLeftRight size={16} className="text-blue-400" />
                      : <span style={{ color: cat?.color }}><CategoryIcon icon={cat?.icon || 'tag'} size={16} /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.description || cat?.name || 'Recurring'}</p>
                    <p className="text-[11px] text-gray-500">
                      {FREQ_LABEL[r.frequency] || 'Monthly'} · {getAcc(r.accountId)?.name || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Amount value={r.amount}
                      className={`text-sm font-semibold ${r.type === 'income' ? 'text-green' : r.type === 'transfer' ? 'text-blue-400' : 'text-red'}`} />
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {paused ? 'Paused' : r.nextDate ? `Next ${fmtDate(r.nextDate)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button onClick={() => updateRecurring(r.id, { isActive: paused })}
                    className="text-gray-500 flex items-center gap-1 text-xs">
                    {paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
                  </button>
                  <button onClick={() => { setEditItem(r); setShowForm(true) }} className="text-gray-500"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteTarget(r)} className="text-gray-500"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditItem(null) }}
        title={editItem ? 'Edit Recurring' : 'Add Recurring'}>
        <RecurringForm recurring={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} />
      </BottomSheet>

      <BottomSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Recurring?">
        <p className="text-gray-400 text-sm mb-5">
          Delete "{deleteTarget?.description || 'this item'}"? Already-posted transactions are kept.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium">Cancel</button>
          <button onClick={() => { deleteRecurring(deleteTarget.id); setDeleteTarget(null) }}
            className="flex-1 py-3 rounded-xl bg-red text-white font-semibold">Delete</button>
        </div>
      </BottomSheet>
    </div>
  )
}
