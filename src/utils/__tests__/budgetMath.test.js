import { describe, it, expect } from 'vitest'
import { effectiveLimit, budgetStatus } from '../budgetMath'

describe('effectiveLimit', () => {
  it('uses the fixed limit by default', () => {
    expect(effectiveLimit({ limit: 5000 })).toBe(5000)
  })
  it('computes percent of income (BUD-6)', () => {
    expect(effectiveLimit({ pctOfIncome: 30 }, { income: 100000 })).toBe(30000)
  })
  it('adds positive rollover carry (BUD-2), ignores negative', () => {
    expect(effectiveLimit({ limit: 5000, rollover: true }, { carry: 1200 })).toBe(6200)
    expect(effectiveLimit({ limit: 5000, rollover: true }, { carry: -800 })).toBe(5000)
  })
  it('ignores carry when rollover is off', () => {
    expect(effectiveLimit({ limit: 5000, rollover: false }, { carry: 1200 })).toBe(5000)
  })
})

describe('budgetStatus', () => {
  it('flags over', () => {
    const s = budgetStatus(6000, 5000)
    expect(s.over).toBe(true)
    expect(s.near).toBe(false)
    expect(s.remaining).toBe(-1000)
  })
  it('flags near at 80%+ but not over', () => {
    expect(budgetStatus(4000, 5000).near).toBe(true)
    expect(budgetStatus(3000, 5000).near).toBe(false)
  })
  it('handles no limit', () => {
    expect(budgetStatus(100, 0)).toMatchObject({ over: false, near: false, pct: 0 })
  })
})
