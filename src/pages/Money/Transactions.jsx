import { useState, useMemo } from 'react'
import { Search, Download, MoreVertical, Check, Square, Pencil, Trash2, X, ArrowLeftRight } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAppStore } from '../../store/useAppStore'
import Amount from '../../components/common/Amount'
import { CATEGORIES } from '../../utils/constants'
import { fmt, fmtDate, monthKey, daysAgo, todayISO } from '../../utils/formatters'
import CategoryIcon from '../../components/common/CategoryIcon'
import BottomSheet from '../../components/common/BottomSheet'
import TransactionForm from '../../components/forms/TransactionForm'

const TYPE_FILTERS = ['Expense', 'Income', 'Transfer', 'All']

function fmtDateHeader(iso) {
  const today = todayISO()
  const yd = new Date(); yd.setDate(yd.getDate() - 1)
  const yesterday = yd.toISOString().split('T')[0]
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Transactions({ onAdd }) {
  const { transactions, accounts, deleteTransaction } = useFinanceStore()
  const { balancesHidden } = useAppStore()
  const [typeFilter, setTypeFilter] = useState('Expense')
  const [accountFilter, setAccountFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [catFilter, setCatFilter] = useState(null)
  const [menuTx, setMenuTx] = useState(null)
  const [editTx, setEditTx] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const thisMonthStart = useMemo(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  }, [])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'All' && t.type !== typeFilter.toLowerCase()) return false
        if (accountFilter !== 'all' && t.accountId !== accountFilter) return false
        if (catFilter && t.categoryId !== catFilter) return false
        if (monthFilter && t.date < thisMonthStart) return false
        if (search) {
          const q = search.toLowerCase()
          const cat = CATEGORIES.find(c => c.id === t.categoryId)
          const acc = accounts.find(a => a.id === t.accountId)
          if (
            !t.description?.toLowerCase().includes(q) &&
            !cat?.name.toLowerCase().includes(q) &&
            !acc?.name.toLowerCase().includes(q) &&
            !String(t.amount).includes(q)
          ) return false
        }
        return true
      })
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date)
        if (dateCmp !== 0) return dateCmp
        const aTs = typeof a.createdAt === 'number' ? a.createdAt : (a.updatedAt || 0)
        const bTs = typeof b.createdAt === 'number' ? b.createdAt : (b.updatedAt || 0)
        return bTs - aTs
      })
  }, [transactions, typeFilter, accountFilter, catFilter, monthFilter, search, thisMonthStart])

  const totalExpense = useMemo(() => filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [filtered])
  const totalIncome  = useMemo(() => filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [filtered])

  const monthlyAvg = useMemo(() => {
    const exp = transactions.filter((t) => t.type === 'expense')
    const months = new Set(exp.map((t) => monthKey(t.date))).size || 1
    return exp.reduce((s, t) => s + Number(t.amount), 0) / months
  }, [transactions])

  const catAmounts = useMemo(() => {
    const cats = CATEGORIES.filter((c) => c.type === (typeFilter === 'Income' ? 'income' : 'expense'))
    return cats.map((cat) => {
      const amt = filtered.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + Number(t.amount), 0)
      return { ...cat, amt }
    }).filter((c) => c.amt > 0)
  }, [filtered, typeFilter])

  const lastEntry = useMemo(() => {
    if (!transactions.length) return null
    return daysAgo([...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date)
  }, [transactions])

  // Date-grouped transactions
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = []
      groups[tx.date].push(tx)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const toggleSelect = (id) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelected(s)
  }

  const handleBulkDelete = async () => {
    for (const id of selected) await deleteTransaction(id)
    setSelected(new Set())
    setSelectMode(false)
  }

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount']
    const rows = filtered.map(t => {
      const cat = CATEGORIES.find(c => c.id === t.categoryId)
      const acc = accounts.find(a => a.id === t.accountId)
      return [t.date, t.type, `"${(t.description || '').replace(/"/g, '""')}"`, cat?.name || '', acc?.name || '', t.amount]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click()
    URL.revokeObjectURL(url)
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
          <button onClick={handleExport} className="w-8 h-8 rounded-lg bg-card-2 flex items-center justify-center text-gray-400">
            <Download size={15} />
          </button>
          <button onClick={() => onAdd?.('expense')}
            className="h-8 px-3 rounded-lg bg-green flex items-center gap-1 text-[#1a3d29] text-xs font-semibold">
            + Add
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="px-4 pb-2">
          <input type="text" placeholder="Search description, category, amount…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card-2 border border-card-border rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
        </div>
      )}

      {/* Type filters */}
      <div className="flex gap-1 px-4 pb-3">
        {TYPE_FILTERS.map((t) => (
          <button key={t} onClick={() => { setTypeFilter(t); setCatFilter(null) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === t ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Account + month filters */}
      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-card-2 border border-card-border rounded-full px-3 py-1.5 text-xs text-gray-300 outline-none flex-shrink-0">
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => setMonthFilter(o => !o)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium flex-shrink-0 transition-all ${monthFilter ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-400'}`}>
          This Month
        </button>
        {lastEntry && <span className="text-xs text-gray-500 ml-auto">Last entry {lastEntry}</span>}
      </div>

      {/* Summary cards */}
      {typeFilter !== 'All' && typeFilter !== 'Transfer' && (
        <div className="flex gap-2 px-4 pb-3">
          {typeFilter === 'Expense' && (
            <>
              <div className="flex-1 bg-card-2 rounded-xl p-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SPENDING</p>
                <Amount value={totalExpense} className="text-sm font-bold text-red" />
              </div>
              <div className="flex-1 bg-card-2 rounded-xl p-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">MONTHLY AVG</p>
                <Amount value={monthlyAvg} className="text-sm font-bold text-red" />
              </div>
            </>
          )}
          {typeFilter === 'Income' && (
            <div className="flex-1 bg-card-2 rounded-xl p-3">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">INCOME</p>
              <Amount value={totalIncome} className="text-sm font-bold text-green" />
            </div>
          )}
        </div>
      )}

      {/* Category carousel — amounts from filtered list */}
      {catAmounts.length > 0 && typeFilter !== 'Transfer' && (
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

      {/* Bulk actions */}
      {selectMode && selected.size > 0 && (
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-xs text-gray-400">{selected.size} selected</span>
          <button onClick={handleBulkDelete} className="text-xs text-red font-semibold">Delete selected</button>
        </div>
      )}

      {/* Transaction list — date grouped */}
      <div className="flex-1 overflow-y-auto pb-32">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-gray-500 text-sm">
              {search ? `No results for "${search}"` : 'No transactions found.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-green text-xs">Clear search</button>
            )}
          </div>
        ) : (
          grouped.map(([date, txs]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-4 py-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">{fmtDateHeader(date)}</span>
                <div className="flex-1 h-px bg-card-border" />
              </div>
              {txs.map((tx) => {
                const cat = getCat(tx.categoryId)
                const acc = getAccount(tx.accountId)
                const toAcc = tx.toAccountId ? getAccount(tx.toAccountId) : null
                return (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-card-border last:border-0"
                    onPointerDown={() => selectMode && toggleSelect(tx.id)}>
                    {selectMode && (
                      <button onPointerDown={(e) => { e.stopPropagation(); toggleSelect(tx.id) }}>
                        {selected.has(tx.id)
                          ? <Check size={16} className="text-green" />
                          : <Square size={16} className="text-gray-600" />}
                      </button>
                    )}

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: tx.type === 'transfer' ? '#1e3a5f' : (cat?.bg || '#1f2937') }}>
                      {tx.type === 'transfer'
                        ? <ArrowLeftRight size={16} className="text-blue-400" />
                        : <span style={{ color: cat?.color }}><CategoryIcon icon={cat?.icon || 'tag'} size={16} /></span>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.description || (tx.type === 'transfer' ? 'Transfer' : cat?.name)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {tx.type === 'transfer' ? (
                          <span className="text-[10px] text-blue-400">
                            {acc?.name} → {toAcc?.name}
                          </span>
                        ) : (
                          <>
                            {cat && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: cat.color, borderColor: cat.color + '44' }}>
                                {cat.name}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500">{acc?.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Amount
                        value={tx.amount}
                        className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green' : tx.type === 'transfer' ? 'text-blue-400' : 'text-red'}`}
                      />
                    </div>

                    <button
                      onPointerDown={(e) => { e.stopPropagation(); setMenuTx(tx) }}
                      className="text-gray-600 p-1 flex-shrink-0">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Action menu */}
      <BottomSheet open={!!menuTx} onClose={() => setMenuTx(null)} title={menuTx?.description || 'Transaction'}>
        <div className="flex flex-col gap-2">
          <button onClick={() => { setEditTx(menuTx); setMenuTx(null) }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-2 text-white text-sm">
            <Pencil size={16} className="text-green" /> Edit
          </button>
          <button onClick={() => { setDeleteTarget(menuTx); setMenuTx(null) }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-2 text-white text-sm">
            <Trash2 size={16} className="text-red" /> Delete
          </button>
        </div>
      </BottomSheet>

      {/* Edit sheet */}
      {editTx && (
        <BottomSheet open={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
          <TransactionForm transaction={editTx} type={editTx.type} onClose={() => setEditTx(null)} />
        </BottomSheet>
      )}

      {/* Delete confirm */}
      <BottomSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Transaction?">
        <p className="text-gray-400 text-sm mb-5">
          Delete "{deleteTarget?.description || 'this transaction'}" (₹{deleteTarget?.amount})? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium">Cancel</button>
          <button onClick={() => { deleteTransaction(deleteTarget.id); setDeleteTarget(null) }}
            className="flex-1 py-3 rounded-xl bg-red text-white font-semibold">Delete</button>
        </div>
      </BottomSheet>
    </div>
  )
}
