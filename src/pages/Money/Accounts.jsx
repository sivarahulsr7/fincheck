import { useState } from 'react'
import { Plus, Edit2, Trash2, Check } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import Amount from '../../components/common/Amount'
import { ACCOUNT_TYPES } from '../../utils/constants'
import BottomSheet from '../../components/common/BottomSheet'

export default function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const openAdd = () => { setEditAcc(null); setName(''); setType('bank'); setBalance(''); setShowForm(true) }
  const openEdit = (a) => { setEditAcc(a); setName(a.name); setType(a.type); setBalance(String(a.balance || 0)); setShowForm(true) }

  const handleSave = async () => {
    if (!name || saving) return
    setSaving(true)
    const at = ACCOUNT_TYPES.find((t2) => t2.id === type)
    const data = { name, type, balance: Number(balance) || 0, color: at?.color || '#4CAF76' }
    if (editAcc?.id) await updateAccount(editAcc.id, data)
    else await addAccount(data)
    setSaving(false)
    setShowForm(false)
  }

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green'
  const labelCls = 'text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 block'

  return (
    <div className="px-4 pt-3 pb-6">
      <div className="bg-card rounded-2xl border border-card-border p-4 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">TOTAL BALANCE</p>
        <Amount value={totalBalance} className="text-2xl font-bold text-white" />
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {accounts.map((acc) => {
          const at = ACCOUNT_TYPES.find((t) => t.id === acc.type)
          return (
            <div key={acc.id} className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: (acc.color || '#4CAF76') + '22' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: acc.color || '#4CAF76' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{acc.name}</p>
                <p className="text-xs text-gray-500 capitalize">{at?.name || acc.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <Amount value={acc.balance || 0}
                  className={`text-sm font-bold ${(acc.balance || 0) >= 0 ? 'text-white' : 'text-red'}`} />
                <button onClick={() => openEdit(acc)} className="text-gray-500">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteTarget(acc)} className="text-gray-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={openAdd}
        className="w-full py-3 rounded-xl border border-dashed border-green text-green text-sm font-medium flex items-center justify-center gap-2">
        <Plus size={16} /> Add Account
      </button>

      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setEditAcc(null) }}
        title={editAcc ? 'Edit Account' : 'Add Account'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${type === t.id ? 'border-green bg-green-tint text-green' : 'border-card-border bg-card-2 text-gray-400'}`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Account Name</label>
            <input type="text" placeholder="e.g. HDFC Savings" value={name}
              onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" inputMode="decimal" placeholder="0" value={balance}
                onChange={(e) => setBalance(e.target.value)} className={`${inputCls} pl-8`} />
            </div>
          </div>
          <button onClick={handleSave} disabled={!name || saving}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${name ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
            {saving ? 'Saving...' : <><Check size={16} /> {editAcc ? 'Update' : 'Add'} Account</>}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Account?">
        <p className="text-gray-400 text-sm mb-5">
          Delete "{deleteTarget?.name}"? The account balance will be removed. Existing transactions are kept.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium">Cancel</button>
          <button onClick={() => { deleteAccount(deleteTarget.id); setDeleteTarget(null) }}
            className="flex-1 py-3 rounded-xl bg-red text-white font-semibold">Delete</button>
        </div>
      </BottomSheet>
    </div>
  )
}
