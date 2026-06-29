import { describe, it, expect } from 'vitest'
import {
  CATEGORIES, ACCOUNT_TYPES, DEFAULT_ACCOUNTS,
  ASSET_TYPES, GOAL_TYPES, RECURRING_FREQ,
  PIN_RESET_ATTEMPTS,
} from '../constants'

describe('CATEGORIES', () => {
  it('every category has required fields', () => {
    CATEGORIES.forEach((c) => {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('type')
      expect(c).toHaveProperty('color')
      expect(c).toHaveProperty('bg')
      expect(c).toHaveProperty('icon')
    })
  })

  it('type is expense or income only', () => {
    CATEGORIES.forEach((c) => {
      expect(['expense', 'income']).toContain(c.type)
    })
  })

  it('has no duplicate ids', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('has both expense and income categories', () => {
    expect(CATEGORIES.some((c) => c.type === 'expense')).toBe(true)
    expect(CATEGORIES.some((c) => c.type === 'income')).toBe(true)
  })

  it('color values are valid hex', () => {
    CATEGORIES.forEach((c) => {
      expect(c.color).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    })
  })
})

describe('ACCOUNT_TYPES', () => {
  it('every type has id, name, icon, color', () => {
    ACCOUNT_TYPES.forEach((t) => {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('icon')
      expect(t).toHaveProperty('color')
    })
  })

  it('includes cash, bank, credit, upi', () => {
    const ids = ACCOUNT_TYPES.map((t) => t.id)
    expect(ids).toContain('cash')
    expect(ids).toContain('bank')
    expect(ids).toContain('credit')
    expect(ids).toContain('upi')
  })
})

describe('DEFAULT_ACCOUNTS', () => {
  it('every default account has required fields', () => {
    DEFAULT_ACCOUNTS.forEach((a) => {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('name')
      expect(a).toHaveProperty('type')
      expect(a).toHaveProperty('balance')
      expect(a).toHaveProperty('color')
    })
  })

  it('all balances start at zero', () => {
    DEFAULT_ACCOUNTS.forEach((a) => {
      expect(a.balance).toBe(0)
    })
  })

  it('has no duplicate ids', () => {
    const ids = DEFAULT_ACCOUNTS.map((a) => a.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('account types match ACCOUNT_TYPES ids', () => {
    const validTypes = ACCOUNT_TYPES.map((t) => t.id)
    DEFAULT_ACCOUNTS.forEach((a) => {
      expect(validTypes).toContain(a.type)
    })
  })
})

describe('ASSET_TYPES', () => {
  it('every asset type has id, name, color', () => {
    ASSET_TYPES.forEach((t) => {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('color')
    })
  })

  it('has no duplicate ids', () => {
    const ids = ASSET_TYPES.map((t) => t.id)
    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe('GOAL_TYPES', () => {
  it('every goal type has id, name, icon, color', () => {
    GOAL_TYPES.forEach((t) => {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('icon')
      expect(t).toHaveProperty('color')
    })
  })
})

describe('RECURRING_FREQ', () => {
  it('includes daily, weekly, monthly, yearly', () => {
    const ids = RECURRING_FREQ.map((f) => f.id)
    expect(ids).toContain('daily')
    expect(ids).toContain('weekly')
    expect(ids).toContain('monthly')
    expect(ids).toContain('yearly')
  })
})

describe('PIN_RESET_ATTEMPTS', () => {
  it('is set to 3', () => expect(PIN_RESET_ATTEMPTS).toBe(3))
})
