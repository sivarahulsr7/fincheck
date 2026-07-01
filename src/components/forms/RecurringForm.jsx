import { useState } from 'react'
import { Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { CATEGORIES } from '../../utils/constants'
import { todayISO } from '../../utils/formatters'
import CategoryIcon from '../common/CategoryIcon'
import DatePicker from '../common/DatePicker'

const FREQS = [
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'monthly', name: 'Monthly' },
  { id: 'yearly', name: 'Yearly' },
]

export default function RecurringForm({ recurring, onClose }) {
  const { accounts, liabilities, assets, addRecurring, updateRecurring } = useFinanceStore()
  const editing = !!recurring
  const [type, setType] = useState(recurring?.type || 'expense')
  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : '')
  const [description, setDescription] = useState(recurring?.description || '')
  const [categoryId, setCategoryId] = useState(recurring?.categoryId || '')
  const [accountId, setAccountId] = useState(recurring?.accountId || accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(recurring?.toAccountId || '')
  const [liabilityId, setLiabilityId] = useState(recurring?.liabilityId || '')
  const [assetId, setAssetId] = useState(recurring?.assetId || '')
  const [frequency, setFrequency] = useState(recurring?.frequency || 'monthly')
  const [startDate, setStartDate] = useState(recurring?.startDate || todayISO())
  const [endDate, setEndDate] = useState(recurring?.endDate || '')
  const [saving, setSaving] = useState(false)

  const cats = CATEGORIES.filter((c) => type !== 'transfer' && c.type === type)

  const selectCategory = (id) => {
    setCategoryId(id)
    if (id !== 'emi') setLiabilityId('')
    if (id !== 'investment') setAssetId('')
  }

  const linkOk =
    (categoryId !== 'emi' || !!liabilityId) &&
    (categoryId !== 'investment' || !!assetId)

  const valid = amount && Number(amount) > 0 && frequency && startDate &&
    (type === 'transfer' ? accountId && toAccountId && accountId !== toAccountId : categoryId && accountId) &&
    linkOk

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const cat = CATEGORIES.find((c) => c.id === categoryId)
      // Preserve the existing schedule on edit unless the start date changed.
      const nextDate = editing && recurring.startDate === startDate
        ? (recurring.nextDate || startDate)
        : startDate
      const data = {
        type, amount: Number(amount),
        description: description || (cat?.name || 'Recurring'),
        categoryId: type === 'transfer' ? null : categoryId,
        accountId, toAccountId: type === 'transfer' ? toAccountId : null,
        liabilityId: type === 'expense' && categoryId === 'emi' && liabilityId !== 'other' ? (liabilityId || null) : null,
        assetId: type === 'expense' && categoryId === 'investment' && assetId !== 'other' ? (assetId || null) : null,
        frequency, startDate, nextDate, endDate: endDate || null,
      }
      if (editing) await updateRecurring(recurring.id, data)
      else await addRecurring(data)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green transition-colors'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 bg-card-2 rounded-xl">
        {['expense', 'income', 'transfer'].map((t) => (
          <button key={t} onClick={() => { setType(t); setCategoryId(''); setLiabilityId(''); setAssetId('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'bg-green text-[#1a3d29]' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <div>
        <label className={labelCls}>Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="0" value={amount}
            onChange={(e) => setAmount(e.target.value)} className={`${inputCls} pl-8 text-xl font-semibold`} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Frequency</label>
        <div className="grid grid-cols-4 gap-2">
          {FREQS.map((f) => (
            <button key={f.id} onClick={() => setFrequency(f.id)}
              className={`py-2 rounded-xl border text-xs font-medium transition-all ${frequency === f.id ? 'border-green bg-green-tint text-green' : 'border-card-border bg-card-2 text-gray-400'}`}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {type !== 'transfer' && (
        <div>
          <label className={labelCls}>Category</label>
          <div className="grid grid-cols-4 gap-2">
            {cats.map((cat) => (
              <button key={cat.id} onClick={() => selectCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${categoryId === cat.id ? 'border-green bg-green-tint' : 'border-card-border bg-card-2'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: cat.bg }}>
                  <span style={{ color: cat.color }}><CategoryIcon icon={cat.icon} size={14} /></span>
                </div>
                <span className="text-[9px] text-gray-300 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Description</label>
        <input type="text" placeholder="e.g. Rent, Salary, SIP" value={description}
          onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>{type === 'transfer' ? 'From Account' : 'Account'}</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${inputCls} cursor-pointer`}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {type === 'transfer' && (
        <div>
          <label className={labelCls}>To Account</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Select account...</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {type === 'expense' && categoryId === 'emi' && (
        <div>
          <label className={labelCls}>Which loan? *</label>
          <select value={liabilityId} onChange={(e) => setLiabilityId(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="" disabled>Select a loan…</option>
            {liabilities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="other">Other (no specific loan)</option>
          </select>
        </div>
      )}
      {type === 'expense' && categoryId === 'investment' && (
        <div>
          <label className={labelCls}>Which asset? *</label>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="" disabled>Select an asset…</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value="other">Other (no specific asset)</option>
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Starts / Next on</label>
        <DatePicker value={startDate} onChange={setStartDate} />
      </div>
      <div>
        <label className={labelCls}>Ends (optional)</label>
        <DatePicker value={endDate} onChange={setEndDate} />
      </div>

      <button onClick={handleSave} disabled={!valid || saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${valid ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
        {saving ? 'Saving...' : <><Check size={16} /> {editing ? 'Update' : 'Add'} Recurring</>}
      </button>
    </div>
  )
}
