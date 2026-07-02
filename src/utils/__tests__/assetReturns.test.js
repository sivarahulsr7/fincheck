import { describe, it, expect } from 'vitest'
import { absoluteReturnPct, cagrPct, yearsHeld } from '../assetReturns'

describe('absoluteReturnPct', () => {
  it('computes gain %', () => expect(absoluteReturnPct(1000, 1200)).toBe(20))
  it('computes loss %', () => expect(absoluteReturnPct(1000, 800)).toBe(-20))
  it('returns null for zero/negative invested', () => {
    expect(absoluteReturnPct(0, 100)).toBeNull()
  })
})

describe('cagrPct', () => {
  const now = new Date(2025, 0, 1)
  it('annualizes over the holding period', () => {
    // 1000 → 1210 over exactly 2 years ≈ 10% CAGR
    const c = cagrPct(1000, 1210, '2023-01-01', now)
    expect(c).toBeGreaterThan(9.5)
    expect(c).toBeLessThan(10.5)
  })
  it('is null without a purchase date or for very short holds', () => {
    expect(cagrPct(1000, 1200, null, now)).toBeNull()
    expect(cagrPct(1000, 1200, '2024-12-20', now)).toBeNull() // < 1 month
  })
  it('is null when invested/current invalid', () => {
    expect(cagrPct(0, 100, '2023-01-01', now)).toBeNull()
  })
})

describe('yearsHeld', () => {
  it('is ~1 for a year ago', () => {
    const y = yearsHeld('2024-01-01', new Date(2025, 0, 1))
    expect(y).toBeGreaterThan(0.99)
    expect(y).toBeLessThan(1.01)
  })
})
