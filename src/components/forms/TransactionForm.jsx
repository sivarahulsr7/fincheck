import { useState } from 'react'
import { Check, Bookmark, X } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import { CATEGORIES } from '../../utils/constants'
import { todayISO } from '../../utils/formatters'
import CategoryIcon from '../common/CategoryIcon'
import DatePicker from '../common/DatePicker'

export default function TransactionForm({ type: initialType = 'expense', transaction, onClose }) {
  const { accounts, liabilities, assets, addTransaction, updateTransaction } = useFinanceStore()
  const { presets, addPreset, removePreset } = useAppStore()
  const editing = !!transaction
  const [type, setType] = useState(transaction?.type || initialType)
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [accountId, setAccountId] = useState(transaction?.accountId || accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId || '')
  const [date, setDate] = useState(transaction?.date || todayISO())
  const [note, setNote] = useState(transaction?.note || transaction?.notes || '')
  const [liabilityId, setLiabilityId] = useState(transaction?.liabilityId || '')
  const [assetId, setAssetId] = useState(transaction?.assetId || '')
  const [tags, setTags] = useState(transaction?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }
  const removeTag = (t) => setTags(tags.filter((x) => x !== t))

  const applyPreset = (p) => {
    setType(p.type || 'expense')
    setAmount(p.amount != null ? String(p.amount) : '')
    setDescription(p.description || '')
    setCategoryId(p.categoryId || '')
    setAccountId(p.accountId || accounts[0]?.id || '')
    if (p.categoryId !== 'emi') setLiabilityId('')
    if (p.categoryId !== 'investment') setAssetId('')
  }
  const saveAsPreset = () => {
    const cat = CATEGORIES.find((c) => c.id === categoryId)
    addPreset({
      label: description || cat?.name || type,
      type, amount: Number(amount) || null, description, categoryId, accountId,
    })
  }

  const cats = CATEGORIES.filter((c) => {
    if (type === 'transfer') return false
    return c.type === type
  })
  const selectedCat = CATEGORIES.find((c) => c.id === categoryId)

  // Links are category-driven: a loan only for "EMI & Loans", an asset only
  // for "Investment". Selecting any other category clears them.
  const selectCategory = (id) => {
    setCategoryId(id)
    if (id !== 'emi') setLiabilityId('')
    if (id !== 'investment') setAssetId('')
  }

  // EMI / Investment categories require an explicit target choice (a specific
  // loan/asset, or "Other").
  const linkOk =
    (categoryId !== 'emi' || !!liabilityId) &&
    (categoryId !== 'investment' || !!assetId)

  const valid = amount && Number(amount) > 0 &&
    (type === 'transfer' ? accountId && toAccountId && accountId !== toAccountId : categoryId && accountId) &&
    date && date <= todayISO() && linkOk

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const data = {
        type, amount: Number(amount), description: description || (selectedCat?.name || 'Transfer'),
        categoryId: type === 'transfer' ? null : categoryId,
        accountId, toAccountId: type === 'transfer' ? toAccountId : null,
        // Links are category-driven. "other" is a valid explicit choice that
        // links to nothing specific (stored as null).
        liabilityId: type === 'expense' && categoryId === 'emi' && liabilityId && liabilityId !== 'other' ? liabilityId : null,
        assetId: type === 'expense' && categoryId === 'investment' && assetId && assetId !== 'other' ? assetId : null,
        tags,
        date, note,
      }
      if (editing) await updateTransaction(transaction.id, data)
      else await addTransaction(data)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green transition-colors'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="flex flex-col gap-4">
      {/* Quick-add presets (TXN-5) — only when creating */}
      {!editing && presets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 flex-shrink-0 bg-card-2 border border-card-border rounded-full pl-3 pr-1 py-1">
              <button onClick={() => applyPreset(p)} className="text-xs text-gray-200 whitespace-nowrap">{p.label}</button>
              <button onClick={() => removePreset(p.id)} className="text-gray-600 p-0.5"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Type selector */}
      <div className="flex gap-1 p-1 bg-card-2 rounded-xl">
        {['expense', 'income', 'transfer'].map((t) => (
          <button key={t} onClick={() => { setType(t); setCategoryId(''); setLiabilityId(''); setAssetId('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${type === t ? 'bg-green text-[#1a3d29]' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className={labelCls}>Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input type="number" inputMode="decimal" placeholder="0"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className={`${inputCls} pl-8 text-xl font-semibold`} />
        </div>
      </div>

      {/* Category (not for transfer) */}
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

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <input type="text" placeholder="What was it for?" value={description}
          onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>

      {/* Account */}
      <div>
        <label className={labelCls}>{type === 'transfer' ? 'From Account' : 'Account'}</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${inputCls} cursor-pointer`}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* To Account (transfer only) */}
      {type === 'transfer' && (
        <div>
          <label className={labelCls}>To Account</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Select account...</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loan repayment — required choice for the "EMI & Loans" category. */}
      {type === 'expense' && categoryId === 'emi' && (
        <div>
          <label className={labelCls}>Which loan is this repaying? *</label>
          <select value={liabilityId} onChange={(e) => setLiabilityId(e.target.value)}
            className={`${inputCls} cursor-pointer`}>
            <option value="" disabled>Select a loan…</option>
            {liabilities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="other">Other (no specific loan)</option>
          </select>
          {liabilityId && liabilityId !== 'other' && (
            liabilities.find((l) => l.id === liabilityId)?.interestRate == null ? (
              <p className="text-[11px] text-orange-400 mt-1">
                ⚠ This loan has no interest rate — the full payment will reduce principal. Set a rate in Wealth → Liabilities for accurate tracking.
              </p>
            ) : (
              <p className="text-[11px] text-gray-500 mt-1">
                Reduces this loan's outstanding principal (interest is excluded automatically).
              </p>
            )
          )}
        </div>
      )}

      {/* Investment contribution — required choice for the "Investment" category. */}
      {type === 'expense' && categoryId === 'investment' && (
        <div>
          <label className={labelCls}>Which asset is this contributing to? *</label>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
            className={`${inputCls} cursor-pointer`}>
            <option value="" disabled>Select an asset…</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value="other">Other (no specific asset)</option>
          </select>
          {assetId && assetId !== 'other' && (
            <p className="text-[11px] text-gray-500 mt-1">
              Adds this amount to the asset's invested value and current value.
            </p>
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <label className={labelCls}>Date</label>
        <DatePicker value={date} onChange={setDate} max={todayISO()} />
      </div>

      {/* Tags (optional) */}
      <div>
        <label className={labelCls}>Tags (optional)</label>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <button key={t} onClick={() => removeTag(t)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-green-tint text-green border border-green-dim">
                #{t} ✕
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" placeholder="e.g. goa-trip, reimbursable" value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            className={inputCls} />
          <button type="button" onClick={addTag} className="px-4 rounded-xl bg-card-2 text-green text-sm font-medium">Add</button>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className={labelCls}>Note (optional)</label>
        <textarea rows={2} placeholder="Any note..." value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputCls} resize-none`} />
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={!valid || saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${valid ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
        {saving ? 'Saving...' : <><Check size={16} /> {editing ? 'Update Transaction' : 'Save Transaction'}</>}
      </button>

      {/* Save as preset (TXN-5) — only when creating a valid non-transfer txn */}
      {!editing && valid && type !== 'transfer' && (
        <button onClick={saveAsPreset}
          className="flex items-center justify-center gap-1.5 text-gray-400 text-xs py-1">
          <Bookmark size={13} /> Save as quick-add preset
        </button>
      )}
    </div>
  )
}
