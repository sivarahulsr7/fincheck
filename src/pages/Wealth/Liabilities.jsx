import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { fmt, fmtDate } from '../../utils/formatters'
import BottomSheet from '../../components/common/BottomSheet'
import LiabilityForm from '../../components/forms/LiabilityForm'

export default function Liabilities() {
  const { liabilities, deleteLiability } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editLiab, setEditLiab] = useState(null)

  const total = liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const totalEmi = liabilities.reduce((s, l) => s + (l.emi || 0), 0)

  return (
    <div className="px-4 pt-3 pb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Liabilities</h2>
          <p className="text-xs text-gray-500">{liabilities.length} liabilities</p>
        </div>
        <button onClick={() => { setEditLiab(null); setShowForm(true) }}
          className="w-9 h-9 rounded-xl bg-red flex items-center justify-center text-white">
          <Plus size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">OUTSTANDING</p>
          <Amount value={total} className="text-base font-bold text-red" />
        </div>
        <div className="bg-card rounded-xl border border-card-border p-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">MONTHLY EMI</p>
          <Amount value={totalEmi} className="text-base font-bold text-white" />
        </div>
      </div>

      {liabilities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No liabilities. Debt-free!</p>
          <button onClick={() => setShowForm(true)} className="text-red text-xs mt-2">Add a liability →</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {liabilities.map((l) => {
            const progress = l.outstandingAmount > 0 && l.originalAmount
              ? Math.max(0, 100 - (l.outstandingAmount / l.originalAmount) * 100)
              : 0
            return (
              <div key={l.id} className="bg-card rounded-xl border border-card-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{l.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{l.liabType?.replace('loan', ' Loan') || 'Loan'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditLiab(l); setShowForm(true) }} className="text-gray-500"><Edit2 size={13} /></button>
                    <button onClick={() => deleteLiability(l.id)} className="text-gray-500"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <Amount value={l.outstandingAmount} className="text-base font-bold text-red" />
                  {l.interestRate && <span className="text-xs text-gray-400">{l.interestRate}% p.a.</span>}
                </div>
                {l.emi > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>EMI: </span><Amount value={l.emi} className="text-gray-300" />
                    {l.endDate && <span>· Ends {fmtDate(l.endDate)}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditLiab(null) }}
        title={editLiab ? 'Edit Liability' : 'Add Liability'}>
        <LiabilityForm liability={editLiab} onClose={() => { setShowForm(false); setEditLiab(null) }} />
      </BottomSheet>
    </div>
  )
}
