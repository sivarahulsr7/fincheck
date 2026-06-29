import { useState } from 'react'
import { Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { todayISO } from '../../utils/formatters'

const TYPES = [
  { id: 'homeloan', name: 'Home Loan' }, { id: 'carloan', name: 'Car Loan' },
  { id: 'personalloan', name: 'Personal Loan' }, { id: 'creditcard', name: 'Credit Card' },
  { id: 'education', name: 'Education Loan' }, { id: 'other', name: 'Other' },
]

export default function LiabilityForm({ liability, onClose }) {
  const { addLiability, updateLiability } = useFinanceStore()
  const [name, setName] = useState(liability?.name || '')
  const [liabType, setLiabType] = useState(liability?.liabType || 'personalloan')
  const [outstandingAmount, setOutstandingAmount] = useState(liability?.outstandingAmount || '')
  const [interestRate, setInterestRate] = useState(liability?.interestRate || '')
  const [emi, setEmi] = useState(liability?.emi || '')
  const [startDate, setStartDate] = useState(liability?.startDate || todayISO())
  const [endDate, setEndDate] = useState(liability?.endDate || '')
  const [saving, setSaving] = useState(false)

  const valid = name && outstandingAmount && Number(outstandingAmount) > 0

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const data = {
        name, liabType,
        outstandingAmount: Number(outstandingAmount),
        interestRate: interestRate ? Number(interestRate) : null,
        emi: emi ? Number(emi) : null,
        startDate, endDate,
      }
      if (liability?.id) await updateLiability(liability.id, data)
      else await addLiability(data)
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
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t.id} onClick={() => setLiabType(t.id)}
              className={`p-2 rounded-xl border text-xs font-medium transition-all ${liabType === t.id ? 'border-red bg-red-tint text-red' : 'border-card-border bg-card-2 text-gray-400'}`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Name</label>
        <input type="text" placeholder="e.g. HDFC Home Loan" value={name}
          onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Outstanding Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="0" value={outstandingAmount}
            onChange={(e) => setOutstandingAmount(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Interest Rate %</label>
          <input type="number" inputMode="decimal" placeholder="e.g. 8.5" value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>EMI / Month</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
            <input type="number" inputMode="decimal" placeholder="0" value={emi}
              onChange={(e) => setEmi(e.target.value)} className={`${inputCls} pl-7`} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <button onClick={handleSave} disabled={!valid || saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${valid ? 'bg-red text-white' : 'bg-card-2 text-gray-600'}`}>
        {saving ? 'Saving...' : <><Check size={16} /> {liability?.id ? 'Update' : 'Add'} Liability</>}
      </button>
    </div>
  )
}
