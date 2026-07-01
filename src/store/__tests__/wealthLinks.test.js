import { describe, it, expect } from 'vitest'
import { principalPortion, txEffects, negateEffects, mergeEffects } from '../useFinanceStore'

describe('principalPortion (amortization)', () => {
  it('splits interest from principal when a rate is set', () => {
    // 12% p.a. on 10,00,000 → 10,000 interest/month; 50,000 payment → 40,000 principal
    expect(principalPortion(50000, 1000000, 12)).toBe(40000)
  })
  it('applies the whole payment to principal when there is no rate', () => {
    expect(principalPortion(50000, 1000000, 0)).toBe(50000)
    expect(principalPortion(50000, 1000000, null)).toBe(50000)
  })
  it('clamps to 0 when the payment does not even cover interest', () => {
    expect(principalPortion(5000, 1000000, 12)).toBe(0) // interest 10,000 > 5,000
  })
  it('clamps to outstanding on a payoff (never negative balance)', () => {
    expect(principalPortion(2000000, 1000000, 12)).toBe(1000000)
  })
  it('returns 0 for a settled or invalid loan', () => {
    expect(principalPortion(50000, 0, 12)).toBe(0)
    expect(principalPortion(NaN, 1000000, 12)).toBe(0)
  })
})

describe('txEffects', () => {
  it('a plain expense only touches its account', () => {
    const e = txEffects({ type: 'expense', accountId: 'A', amount: 500 })
    expect(e).toEqual({ accounts: { A: -500 }, liabilities: {}, assets: {} })
  })
  it('a loan repayment reduces the account and the linked liability principal', () => {
    const e = txEffects({ type: 'expense', accountId: 'A', amount: 50000, liabilityId: 'L1', liabilityPrincipal: 40000 })
    expect(e.accounts).toEqual({ A: -50000 })
    expect(e.liabilities).toEqual({ L1: -40000 })
    expect(e.assets).toEqual({})
  })
  it('an investment contribution reduces the account and raises the linked asset', () => {
    const e = txEffects({ type: 'expense', accountId: 'A', amount: 25000, assetId: 'S1', assetContribution: 25000 })
    expect(e.accounts).toEqual({ A: -25000 })
    expect(e.assets).toEqual({ S1: 25000 })
    expect(e.liabilities).toEqual({})
  })
})

describe('reversal symmetry (add then delete leaves everything unchanged)', () => {
  it('repayment nets to zero across all collections', () => {
    const tx = { type: 'expense', accountId: 'A', amount: 50000, liabilityId: 'L1', liabilityPrincipal: 40000 }
    const net = mergeEffects(txEffects(tx), negateEffects(txEffects(tx)))
    expect(Object.values(net.accounts).every((v) => v === 0)).toBe(true)
    expect(Object.values(net.liabilities).every((v) => v === 0)).toBe(true)
  })
})

describe('editing a repayment to a different loan', () => {
  it('restores the old loan principal and reduces the new one', () => {
    const oldTx = { type: 'expense', accountId: 'A', amount: 50000, liabilityId: 'L1', liabilityPrincipal: 40000 }
    const newTx = { type: 'expense', accountId: 'A', amount: 30000, liabilityId: 'L2', liabilityPrincipal: 25000 }
    const eff = mergeEffects(negateEffects(txEffects(oldTx)), txEffects(newTx))
    expect(eff.liabilities).toEqual({ L1: 40000, L2: -25000 }) // L1 restored, L2 reduced
    expect(eff.accounts).toEqual({ A: 20000 }) // +50000 reverse, -30000 apply
  })
})
