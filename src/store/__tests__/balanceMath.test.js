import { describe, it, expect } from 'vitest'
import { txDeltas, negate, mergeDeltas } from '../useFinanceStore'

describe('txDeltas', () => {
  it('expense debits its account', () => {
    expect(txDeltas({ type: 'expense', accountId: 'A', amount: 100 })).toEqual({ A: -100 })
  })
  it('income credits its account', () => {
    expect(txDeltas({ type: 'income', accountId: 'A', amount: 100 })).toEqual({ A: 100 })
  })
  it('transfer debits source and credits destination', () => {
    expect(txDeltas({ type: 'transfer', accountId: 'A', toAccountId: 'B', amount: 100 }))
      .toEqual({ A: -100, B: 100 })
  })
  it('coerces string amounts', () => {
    expect(txDeltas({ type: 'expense', accountId: 'A', amount: '250' })).toEqual({ A: -250 })
  })
  it('returns {} for a non-finite amount (no NaN poisoning)', () => {
    expect(txDeltas({ type: 'expense', accountId: 'A', amount: 'abc' })).toEqual({})
    expect(txDeltas({ type: 'expense', accountId: 'A', amount: undefined })).toEqual({})
    expect(txDeltas({ type: 'expense', accountId: 'A' })).toEqual({})
  })
  it('returns {} for null/unknown type', () => {
    expect(txDeltas(null)).toEqual({})
    expect(txDeltas({ type: 'mystery', accountId: 'A', amount: 100 })).toEqual({})
  })
})

describe('negate + mergeDeltas', () => {
  it('negate flips every delta', () => {
    expect(negate({ A: -100, B: 100 })).toEqual({ A: 100, B: -100 })
  })
  it('mergeDeltas sums overlapping accounts', () => {
    expect(mergeDeltas({ A: 100 }, { A: -30, B: 50 })).toEqual({ A: 70, B: 50 })
  })

  // The C3 drift bug: editing an expense amount on the SAME account.
  it('same-account expense edit nets the difference (no drift)', () => {
    const oldTx = { type: 'expense', accountId: 'A', amount: 100 }
    const newTx = { type: 'expense', accountId: 'A', amount: 300 }
    // reverse old (+100), apply new (-300) → net -200 on A
    const net = mergeDeltas(negate(txDeltas(oldTx)), txDeltas(newTx))
    expect(net).toEqual({ A: -200 })
  })

  it('editing a transfer to a different destination reverses old legs and applies new', () => {
    const oldTx = { type: 'transfer', accountId: 'A', toAccountId: 'B', amount: 100 }
    const newTx = { type: 'transfer', accountId: 'A', toAccountId: 'C', amount: 100 }
    // reverse old: A +100, B -100 ; apply new: A -100, C +100 → A nets 0, B -100, C +100
    const net = mergeDeltas(negate(txDeltas(oldTx)), txDeltas(newTx))
    expect(net).toEqual({ A: 0, B: -100, C: 100 })
  })

  it('deleting a transaction is the negation of its effect', () => {
    const tx = { type: 'income', accountId: 'A', amount: 500 }
    expect(negate(txDeltas(tx))).toEqual({ A: -500 })
  })
})
