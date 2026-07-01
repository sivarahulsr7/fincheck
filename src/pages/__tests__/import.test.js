import { describe, it, expect } from 'vitest'
import { isRecognizedExport, buildWrites } from '../Import'

describe('isRecognizedExport', () => {
  it('accepts objects with any known FinBoom array', () => {
    expect(isRecognizedExport({ transactions: [] })).toBe(true)
    expect(isRecognizedExport({ moneyAccounts: [] })).toBe(true)
  })
  it('rejects unrelated / malformed JSON', () => {
    expect(isRecognizedExport(null)).toBe(false)
    expect(isRecognizedExport({ foo: 'bar' })).toBe(false)
    expect(isRecognizedExport([1, 2, 3])).toBe(false)
    expect(isRecognizedExport('a string')).toBe(false)
  })
})

describe('buildWrites — validation & normalization', () => {
  it('skips transactions with missing amount, type, or date', () => {
    const { writes, skipped } = buildWrites({
      transactions: [
        { type: 'expense', amount: 100, date: '2024-01-05', account: 'HDFC' }, // valid
        { type: 'expense', amount: 'oops', date: '2024-01-05' },               // NaN amount
        { type: 'expense', date: '2024-01-05' },                               // no amount
        { type: 'nonsense', amount: 50, date: '2024-01-05' },                  // bad type
        { type: 'income', amount: 50, date: 'not-a-date' },                    // bad date
      ],
    })
    const txWrites = writes.filter((w) => w.col === 'transactions')
    expect(txWrites).toHaveLength(1)
    expect(txWrites[0].data.amount).toBe(100)
    expect(skipped.transactions).toBe(4)
  })

  it('never emits a NaN amount', () => {
    const { writes } = buildWrites({
      transactions: [{ type: 'expense', amount: 100, date: '2024-01-05' }],
    })
    for (const w of writes) {
      if ('amount' in w.data) expect(Number.isFinite(w.data.amount)).toBe(true)
    }
  })

  it('maps asset fields to the canonical schema (assetType/units/purchaseDate)', () => {
    const { writes } = buildWrites({
      assets: [{ name: 'Nifty 50', productType: 'EQUITY_MUTUAL_FUND', investedAmount: 1000, currentValue: 1200, quantity: 10, purchaseDate: '2023-06-01T00:00:00Z' }],
    })
    const a = writes.find((w) => w.col === 'assets').data
    expect(a.assetType).toBe('equity')
    expect(a.units).toBe(10)
    expect(a.purchaseDate).toBe('2023-06-01')
    expect(a).not.toHaveProperty('type')
    expect(a).not.toHaveProperty('quantity')
  })

  it('links transfer legs and clears categoryId', () => {
    const { writes } = buildWrites({
      moneyAccounts: [{ name: 'HDFC' }, { name: 'ICICI' }],
      transactions: [{ type: 'transfer', amount: 500, date: '2024-02-01', account: 'HDFC', toAccount: 'ICICI' }],
    })
    const tx = writes.find((w) => w.col === 'transactions').data
    expect(tx.categoryId).toBeNull()
    expect(tx.accountId).toBeTruthy()
    expect(tx.toAccountId).toBeTruthy()
    expect(tx.accountId).not.toBe(tx.toAccountId)
  })

  it('skips zero/invalid budgets and liabilities', () => {
    const { skipped } = buildWrites({
      liabilities: [{ name: 'Loan', outstandingAmount: 0 }, { outstandingAmount: 5000 }],
      budgets: [{ month: '2024-01', categoryBudgets: [{ category: 'FOOD', amount: 0 }] }],
    })
    expect(skipped.liabilities).toBe(2)
    expect(skipped.budgets).toBe(1)
  })
})
