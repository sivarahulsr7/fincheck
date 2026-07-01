import { describe, it, expect } from 'vitest'
import { isInvestmentExpense, isSpendingExpense, sumSpending, sumInvested } from '../txClassify'

const txs = [
  { type: 'expense', categoryId: 'food', amount: 500 },
  { type: 'expense', categoryId: 'investment', amount: 10000 },
  { type: 'expense', categoryId: 'emi', amount: 2000 },
  { type: 'income', categoryId: 'salary', amount: 50000 },
]

describe('txClassify', () => {
  it('classifies investment expenses separately from spending', () => {
    expect(isInvestmentExpense(txs[1])).toBe(true)
    expect(isSpendingExpense(txs[1])).toBe(false)
    expect(isSpendingExpense(txs[0])).toBe(true)
    expect(isSpendingExpense(txs[2])).toBe(true) // EMI is spending
  })
  it('income is neither spending nor investment', () => {
    expect(isSpendingExpense(txs[3])).toBe(false)
    expect(isInvestmentExpense(txs[3])).toBe(false)
  })
  it('sumSpending excludes investments; sumInvested captures them', () => {
    expect(sumSpending(txs)).toBe(2500)   // 500 food + 2000 emi
    expect(sumInvested(txs)).toBe(10000)  // investment only
  })
})
