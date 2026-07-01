import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader, FileJson } from 'lucide-react'
import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { todayISO } from '../utils/formatters'
import { useFinanceStore } from '../store/useFinanceStore'

const CATEGORY_MAP = {
  TRANSPORT: 'transport',
  OTHER: 'other',
  UTILITIES: 'other',
  PARENTS: 'parents',
  FOOD: 'food',
  HEALTHCARE: 'healthcare',
  MISC: 'other',
  INVESTMENT: 'investment',
  PERSONAL_CARE: 'shopping',
  SUBSCRIPTIONS: 'entertainment',
  EMI_LOAN: 'emi',
  HOUSING: 'housing',
  SALARY: 'salary',
  FREELANCE: 'freelance',
  BUSINESS: 'business',
  RETURNS: 'returns',
  ENTERTAINMENT: 'entertainment',
  EDUCATION: 'education',
  SHOPPING: 'shopping',
  GIFTS: 'gifts',
}

const ASSET_TYPE_MAP = {
  EQUITY_MUTUAL_FUND: 'equity',
  DEBT_MUTUAL_FUND: 'debt',
  GOLD: 'gold',
  STOCKS: 'stock',
  FIXED_DEPOSIT: 'fd',
  REAL_ESTATE: 'realestate',
  CRYPTO: 'crypto',
}

const LIAB_TYPE_MAP = {
  HOME_LOAN: 'homeloan',
  CAR_LOAN: 'carloan',
  PERSONAL_LOAN: 'personalloan',
  CREDIT_CARD: 'creditcard',
  EDUCATION_LOAN: 'education',
}

const ACCOUNT_TYPE_MAP = {
  BANK: 'bank',
  SAVINGS: 'bank',
  CREDIT: 'credit',
  CASH: 'cash',
  WALLET: 'upi',
}

function newId() {
  return doc(collection(db, '_')).id
}

const num = (v, fallback = 0) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}
const isValidDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const isoDay = (s) => (typeof s === 'string' && s.includes('T') ? s.split('T')[0] : s)

// Is this object even a FinBoom export? Reject unrelated JSON up front.
export function isRecognizedExport(data) {
  if (!data || typeof data !== 'object') return false
  return ['moneyAccounts', 'transactions', 'assets', 'liabilities', 'budgets']
    .some((k) => Array.isArray(data[k]))
}

// Build the full list of writes, validating and normalizing each row.
// Invalid rows are skipped and counted rather than aborting the whole import
// or writing NaN/garbage.
export function buildWrites(data) {
  const now = Date.now()
  const writes = []
  const skipped = { transactions: 0, assets: 0, liabilities: 0, budgets: 0 }
  const accountIdMap = {}

  for (const acc of (data.moneyAccounts || [])) {
    const id = newId()
    accountIdMap[acc.name] = id
    writes.push({ col: 'accounts', id, data: {
      id,
      name: acc.bankName || acc.name || 'Account',
      type: ACCOUNT_TYPE_MAP[acc.type] || 'bank',
      balance: num(acc.balance),
      color: '#3B82F6',
      createdAt: now,
      updatedAt: now,
    } })
  }

  for (const tx of (data.transactions || [])) {
    const type = String(tx.type || '').toLowerCase()
    const amount = num(tx.amount, NaN)
    // A transaction is useless without a valid type, finite amount, and date.
    if (!['expense', 'income', 'transfer'].includes(type) || !Number.isFinite(amount) || !isValidDate(isoDay(tx.date))) {
      skipped.transactions++
      continue
    }
    const id = newId()
    writes.push({ col: 'transactions', id, data: {
      id,
      type,
      amount,
      accountId: accountIdMap[tx.account] || null,
      toAccountId: type === 'transfer' ? (accountIdMap[tx.toAccount] || null) : null,
      categoryId: type === 'transfer' ? null : (CATEGORY_MAP[tx.category] || 'other'),
      description: tx.description || '',
      date: isoDay(tx.date),
      notes: tx.notes || '',
      createdAt: now,
      updatedAt: now,
    } })
  }

  for (const asset of (data.assets || [])) {
    const invested = num(asset.investedAmount)
    const current = num(asset.currentValue, invested)
    if (!asset.name || (invested <= 0 && current <= 0)) { skipped.assets++; continue }
    const id = newId()
    writes.push({ col: 'assets', id, data: {
      id,
      name: asset.name,
      assetType: ASSET_TYPE_MAP[asset.productType] || 'other',
      investedAmount: invested,
      currentValue: current,
      units: asset.quantity != null ? num(asset.quantity) : null,
      purchaseDate: isValidDate(isoDay(asset.purchaseDate)) ? isoDay(asset.purchaseDate) : null,
      notes: asset.notes || '',
      createdAt: now,
      updatedAt: now,
    } })
  }

  for (const liab of (data.liabilities || [])) {
    const outstanding = num(liab.outstandingAmount)
    if (!liab.name || outstanding <= 0) { skipped.liabilities++; continue }
    const id = newId()
    writes.push({ col: 'liabilities', id, data: {
      id,
      name: liab.name,
      liabType: LIAB_TYPE_MAP[liab.liabilityType] || 'other',
      outstandingAmount: outstanding,
      originalAmount: liab.originalAmount != null ? num(liab.originalAmount) : null,
      interestRate: liab.interestRate != null ? num(liab.interestRate) : null,
      emi: liab.monthlyEmi != null ? num(liab.monthlyEmi) : null,
      startDate: isValidDate(isoDay(liab.startDate)) ? isoDay(liab.startDate) : todayISO(),
      endDate: null,
      createdAt: now,
      updatedAt: now,
    } })
  }

  for (const budget of (data.budgets || [])) {
    for (const cb of (budget.categoryBudgets || [])) {
      const limit = num(cb.amount, NaN)
      if (!Number.isFinite(limit) || limit <= 0 || !budget.month) { skipped.budgets++; continue }
      const id = newId()
      writes.push({ col: 'budgets', id, data: {
        id,
        categoryId: CATEGORY_MAP[cb.category] || 'other',
        monthKey: budget.month,
        limit,
        spent: 0,
        updatedAt: now,
      } })
    }
  }

  return { writes, skipped }
}

async function runImport(data) {
  if (!isRecognizedExport(data)) {
    throw new Error('This file is not a recognized FinBoom export.')
  }
  const { writes, skipped } = buildWrites(data)

  // Firestore caps a writeBatch at 500 ops — chunk to stay well under.
  const CHUNK = 450
  for (let i = 0; i < writes.length; i += CHUNK) {
    const batch = writeBatch(db)
    for (const w of writes.slice(i, i + CHUNK)) batch.set(doc(db, w.col, w.id), w.data)
    await batch.commit()
  }

  return { imported: writes.length, skipped }
}

export default function Import() {
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef()
  const { destroy, init } = useFinanceStore()

  const handleFile = (f) => {
    if (!f) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        setFile(f)
        setParsed(data)
      } catch {
        setError('Invalid JSON file — could not parse')
      }
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (!parsed || status === 'importing') return
    setStatus('importing')
    setError('')
    try {
      const res = await runImport(parsed)
      setResult(res)
      // Force store to reconnect listeners and pull fresh data from Firestore
      destroy()
      init()
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Import failed. Check console for details.')
      setStatus('error')
    }
  }

  const skippedTotal = result
    ? Object.values(result.skipped).reduce((s, n) => s + n, 0)
    : 0

  const counts = parsed ? {
    accounts: (parsed.moneyAccounts || []).length,
    assets: (parsed.assets || []).length,
    liabilities: (parsed.liabilities || []).length,
    transactions: (parsed.transactions || []).length,
    budgets: (parsed.budgets || []).reduce((s, b) => s + (b.categoryBudgets || []).length, 0),
  } : null

  if (status === 'done') return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
      <CheckCircle size={64} className="text-green" />
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Import Complete</h2>
        <p className="text-gray-400 text-sm">Imported {result?.imported ?? 0} record{result?.imported !== 1 ? 's' : ''} into Fin Check.</p>
        {skippedTotal > 0 && (
          <p className="text-yellow-300 text-xs mt-2">
            Skipped {skippedTotal} invalid row{skippedTotal !== 1 ? 's' : ''} (missing amount, date, or type).
          </p>
        )}
        <p className="text-gray-500 text-xs mt-2">Tap ← Back to see your data.</p>
      </div>
    </div>
  )

  return (
    <div className="page-content px-4 pt-4">
      <h1 className="text-xl font-bold text-white mb-1">Import from FinBoom</h1>
      <p className="text-gray-500 text-sm mb-6">Select your exported FinBoom JSON file</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-card border-2 border-dashed border-card-border rounded-2xl p-8 flex flex-col items-center gap-3 mb-4 active:scale-95 transition-transform">
        <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center">
          <FileJson size={28} className="text-green" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-sm">{file ? file.name : 'Tap to select file'}</p>
          <p className="text-gray-500 text-xs mt-1">
            {file ? 'Tap to change' : 'Choose your FinBoom export (.json)'}
          </p>
        </div>
      </button>

      {error && (
        <div className="flex items-center gap-2 bg-red/10 border border-red/30 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red flex-shrink-0" />
          <p className="text-red text-sm">{error}</p>
        </div>
      )}

      {counts && (
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-card-border">
            <p className="text-sm font-semibold text-white">Preview</p>
            {parsed?.exportedAt && (
              <p className="text-xs text-gray-500 mt-0.5">
                Exported {new Date(parsed.exportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          {[
            { label: 'Accounts',         count: counts.accounts,     color: '#3B82F6' },
            { label: 'Transactions',     count: counts.transactions, color: '#4CAF76' },
            { label: 'Assets',           count: counts.assets,       color: '#A855F7' },
            { label: 'Liabilities',      count: counts.liabilities,  color: '#E05252' },
            { label: 'Budget categories',count: counts.budgets,      color: '#F97316' },
          ].map(({ label, count, color }, i, arr) => (
            <div key={label}
              className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-card-border' : ''}`}>
              <p className="text-sm text-gray-300">{label}</p>
              <span className="text-sm font-bold tabular-nums" style={{ color }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {counts && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-6">
          <p className="text-yellow-300 text-xs leading-relaxed">
            Data will be <strong>added</strong> alongside existing data. Account balance is imported directly from FinBoom. Run this only once.
          </p>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!parsed || status === 'importing'}
        className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          parsed && status !== 'importing' ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'
        }`}>
        {status === 'importing'
          ? <><Loader size={16} className="animate-spin" /> Importing…</>
          : <><Upload size={16} /> Import Data</>
        }
      </button>
    </div>
  )
}
