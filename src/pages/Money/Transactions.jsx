import { useState, useMemo } from 'react'
import { Search, Download, MoreVertical, Check, Square, Pencil, Trash2, X } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { fmt, fmtDate, monthKey, daysAgo } from '../../utils/formatters'
import CategoryIcon from '../../components/common/CategoryIcon'
import BottomSheet from '../../components/common/BottomSheet'
import TransactionForm from '../../components/forms/TransactionForm'

const TYPE_FILTERS = ['Expense', 'Income', 'Transfer', 'All']

export default function Transactions({ onAdd }) {
  const { transactions, accounts, deleteTransaction } = useFinanceStore()
  const { balancesHidden } = useAppStore()
  const [typeFilter, setTypeFilter] = useState('Expense')
  const [accountFilter, setAccountFilter] = useState('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Category filter
  const [catFilter, setCatFilter] = useState(null)
  const [menuTx, setMenuTx] = useState(null)
  const [editTx, setEditTx] = useState(null)

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'All' && t.type !== typeFilter.toLowerCase()) return false
        if (accountFilter !== 'all' && t.accountId !== accountFilter) return false
        if (catFilter && t.categoryId !== catFilter) return false
        if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, typeFilter, accountFilter, catFilter, search])

  const totalSpending = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Monthly avg
  const monthlyTxs = transactions.filter((t) => t.type === 'expense')
  const months = new Set(monthlyTxs.map((t) => monthKey(t.date))).size || 1
  const monthlyAvg = monthlyTxs.reduce((s, t) => s + Number(t.amount), 0) / months

  // Categories for carousel
  const expCats = CATEGORIES.filter((c) => c.type === (typeFilter === 'Income' ? 'income' : 'expense'))
  const catAmounts = expCats.map((cat) => {
    const amt = transactions.filter((t) => t.categoryId === cat.id && t.type !== 'transfer').reduce((s, t) => s + Number(t.amount), 0)
    return { ...cat, amt }
  }).filter((c) => c.amt > 0)

  const lastEntry = transactions.length > 0 ? daysAgo(transactions.sort((a, b) => b.date.localeCompare(a.date))[0]?.date) : null

  const toggleSelect = (id) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  const handleDelete = async () => {
    for (const id of selected) await deleteTransaction(id)
    setSelected(new Set())
    setSelectMode(false)
  }

  const getAccount = (id) => accounts.find((a) => a.id === id)
  const getCat = (id) => CATEGORIES.find((c) => c.id === id)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h2 className="text-lg font-bold text-white">Transactions</h2>
          <p className="text-xs text-gray-500">{filtered.length} entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSearchOpen((o) => !o)} className="w-8 h-8 rounded-lg bg-card-2 flex items-center justify-center text-gray-400">
            <Search size={15} />
          </button>
          <button onClick={() => alert('Export as CSV coming soon')} className="w-8 h-8 rounded-lg bg-card-2 flex items-center justify-center text-gray-400">
            <Download size={15} />
          </button>
          <button onClick={() => onAdd?.('expense')}
            className="h-8 px-3 rounded-lg bg-green flex items-center gap-1 text-[#1a3d29] text-xs font-semibold">
            + Add
          </button>
        </div>
      </div>

      {/* Search */}
      {searchOpen && (
        <div className="px-4 pb-2">
          <input type="text" placeholder="Search transactions..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card-2 border border-card-border rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
        </div>
      )}

      {/* Type filters */}
      <div className="flex gap-1 px-4 pb-3">
        {TYPE_FILTERS.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === t ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Account + date filters */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-card-2 border border-card-border rounded-full px-3 py-1.5 text-xs text-gray-300 outline-none flex-shrink-0">
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="bg-card-2 border border-card-border rounded-full px-3 py-1.5 text-xs text-gray-300 flex-shrink-0">
          This Month
        </div>
        {lastEntry && <span className="text-xs text-gray-500 ml-auto">Last entry {lastEntry}</span>}
      </div>

      {/* Summary cards */}
      {typeFilter !== 'All' && typeFilter !== 'Transfer' && (
        <div className="flex gap-2 px-4 pb-3">
          <div className="flex-1 bg-card-2 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">
              {typeFilter === 'Expense' ? 'SPENDING' : 'INCOME'}
            </p>
            <Amount value={totalSpending} className="text-sm font-bold text-red" />
          </div>
          {typeFilter === 'Expense' && (
            <div className="flex-1 bg-card-2 rounded-xl p-3">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">MONTHLY AVG</p>
              <Amount value={monthlyAvg} className="text-sm font-bold text-red" />
              <p className="text-[10px] text-gray-500 mt-0.5">This Month</p>
            </div>
          )}
        </div>
      )}

      {/* Category carousel */}
      {catAmounts.length > 0 && (
        <div className="flex gap-3 px-4 pb-3 overflow-x-auto">
          {catAmounts.map((cat) => (
            <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? null : cat.id)}
              className={`flex flex-col items-center flex-shrink-0 transition-all ${catFilter === cat.id ? 'opacity-100' : 'opacity-70'}`}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                style={{ background: catFilter === cat.id ? cat.color : cat.bg }}>
                <span style={{ color: catFilter === cat.id ? '#fff' : cat.color }}>
                  <CategoryIcon icon={cat.icon} size={18} />
                </span>
              </div>
              <span className="text-[9px] text-gray-400 text-center w-14 leading-tight">{cat.name}</span>
              <Amount value={cat.amt} className="text-[9px] text-gray-500" />
            </button>
          ))}
        </div>
      )}

      {/* Select all / bulk actions */}
      {selectMode && selected.size > 0 && (
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-xs text-gray-400">{selected.size} selected</span>
          <button onClick={handleDelete} className="text-xs text-red font-semibold">Delete selected</button>
        </div>
      )}

      {/* Transaction list */}
      <div className="flex flex-col divide-y divide-card-border">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No transactions found.</p>
            <button onClick={() => onAdd?.('expense')} className="text-green text-xs mt-2">Add your first transaction →</button>
          </div>
        ) : (
          <>
            <div className="flex items-center px-4 py-2">
              <button onClick={() => setSelectMode((o) => !o)} className="text-xs text-gray-500 flex items-center gap-1">
                <Square size={12} /> {selectMode ? 'Cancel' : 'Select all'}
              </button>
            </div>
            {filtered.map((tx) => {
              const cat = getCat(tx.categoryId)
              const acc = getAccount(tx.accountId)
              const isSelected = selected.has(tx.id)
              return (
                <div key={tx.id}
                  className={`flex items-center gap-3 px-4 py-3 ${isSelected ? 'bg-green-tint' : ''}`}
                  onClick={() => selectMode && toggleSelect(tx.id)}>
                  {selectMode && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-green border-green' : 'border-gray-600'}`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description || cat?.name || tx.type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat && (
                        <span className="category-tag" style={{ background: cat.bg, color: cat.color }}>
                          {cat.name}
                        </span>
                      )}
                      {acc && <span className="text-[10px] text-gray-500">{acc.name}</span>}
                      <span className="text-[10px] text-gray-500">{fmtDate(tx.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Amount value={tx.amount}
                      className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green' : tx.type === 'expense' ? 'text-red' : 'text-gray-300'}`} />
                    <button className="p-1 text-gray-500 active:text-gray-300"
                      onPointerDown={(e) => { e.stopPropagation(); setMenuTx(tx) }}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Transaction action menu */}
      <BottomSheet open={!!menuTx} onClose={() => setMenuTx(null)} title={menuTx?.description || 'Transaction'}>
        {menuTx && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setEditTx(menuTx); setMenuTx(null) }}
              className="flex items-center gap-3 w-full px-4 py-3.5 bg-card-2 rounded-xl text-white text-sm font-medium">
              <Pencil size={16} className="text-green" /> Edit transaction
            </button>
            <button
              onClick={async () => { await deleteTransaction(menuTx.id); setMenuTx(null) }}
              className="flex items-center gap-3 w-full px-4 py-3.5 bg-card-2 rounded-xl text-red text-sm font-medium">
              <Trash2 size={16} /> Delete transaction
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Edit transaction sheet */}
      <BottomSheet open={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
        {editTx && (
          <TransactionForm
            transaction={editTx}
            type={editTx.type}
            onClose={() => setEditTx(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
