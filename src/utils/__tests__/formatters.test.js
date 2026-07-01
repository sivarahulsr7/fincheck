import { describe, it, expect } from 'vitest'
import {
  fmt, fmtCompact, fmtDate, fmtMonth, fmtPct,
  todayISO, monthKey, startOfMonth, endOfMonth, daysAgo, nDaysAgo,
  toISO, parseLocal,
} from '../formatters'

// Local YYYY-MM-DD for a given date — the expected behavior everywhere.
const localISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('fmt', () => {
  it('formats zero', () => expect(fmt(0)).toBe('₹0'))
  it('formats null/undefined as ₹0', () => {
    expect(fmt(null)).toBe('₹0')
    expect(fmt(undefined)).toBe('₹0')
  })
  it('uses absolute value for negatives', () => {
    expect(fmt(-500)).toContain('500')
    expect(fmt(-500)).toContain('₹')
  })
  it('formats positive values with ₹ symbol', () => {
    expect(fmt(1000)).toContain('₹')
    expect(fmt(1000)).toContain('1')
  })
  it('does not compact by default', () => {
    expect(fmt(1500000)).not.toContain('L')
    expect(fmt(5000)).not.toContain('K')
  })
})

describe('fmtCompact', () => {
  it('formats lakhs (1L = 1,00,000)', () => {
    expect(fmtCompact(100000)).toBe('₹1.0L')
    expect(fmtCompact(1000000)).toBe('₹10.0L')
    expect(fmtCompact(2500000)).toBe('₹25.0L')
  })
  it('formats crores (1Cr = 1,00,00,000)', () => {
    expect(fmtCompact(10000000)).toBe('₹1.0Cr')
    expect(fmtCompact(25000000)).toBe('₹2.5Cr')
  })
  it('formats values >= 1K as K', () => {
    expect(fmtCompact(5000)).toBe('₹5.0K')
    expect(fmtCompact(1500)).toBe('₹1.5K')
  })
  it('formats values under 1K without suffix', () => {
    const result = fmtCompact(500)
    expect(result).toContain('₹')
    expect(result).not.toContain('K')
    expect(result).not.toContain('L')
  })
  it('preserves the sign of negative compact values', () => {
    expect(fmtCompact(-5000)).toBe('-₹5.0K')
    expect(fmtCompact(-2500000)).toBe('-₹25.0L')
  })
})

describe('fmtDate', () => {
  it('returns empty string for falsy input', () => expect(fmtDate('')).toBe(''))
  it('includes day and short month name', () => {
    const result = fmtDate('2024-01-15')
    expect(result).toContain('15')
    expect(result).toContain('Jan')
  })
  it('formats June date correctly', () => {
    const result = fmtDate('2024-06-01')
    expect(result).toContain('1')
    expect(result).toContain('Jun')
  })
})

describe('fmtMonth', () => {
  it('returns empty string for falsy input', () => expect(fmtMonth('')).toBe(''))
  it('includes short month and 2-digit year', () => {
    const result = fmtMonth('2024-03-10')
    expect(result).toContain('Mar')
    expect(result).toContain('24')
  })
})

describe('fmtPct', () => {
  it('prefixes positive values with +', () => expect(fmtPct(5.5)).toBe('+5.5%'))
  it('prefixes zero with +', () => expect(fmtPct(0)).toBe('+0.0%'))
  it('keeps negative sign', () => expect(fmtPct(-3.2)).toBe('-3.2%'))
  it('returns 0.0% for non-finite input', () => {
    expect(fmtPct(null)).toBe('0.0%')
    expect(fmtPct(undefined)).toBe('0.0%')
    expect(fmtPct(NaN)).toBe('0.0%')
    expect(fmtPct(Infinity)).toBe('0.0%')
  })
  it('rounds to 1 decimal place', () => expect(fmtPct(5.678)).toBe('+5.7%'))
})

describe('toISO / parseLocal', () => {
  it('toISO formats a date with local fields', () => {
    expect(toISO(new Date(2024, 0, 5))).toBe('2024-01-05')
    expect(toISO(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
  it('parseLocal round-trips with toISO', () => {
    expect(toISO(parseLocal('2024-06-20'))).toBe('2024-06-20')
  })
  it('parseLocal reads the intended calendar day (not UTC-shifted)', () => {
    const d = parseLocal('2024-06-20')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(20)
  })
})

describe('todayISO', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('matches today\'s LOCAL date', () => {
    expect(todayISO()).toBe(localISO(new Date()))
  })
})

describe('monthKey', () => {
  it('returns YYYY-MM from a Date object', () => {
    expect(monthKey(new Date('2024-01-15'))).toBe('2024-01')
  })
  it('returns YYYY-MM from an ISO date string', () => {
    expect(monthKey('2024-06-20')).toBe('2024-06')
  })
  it('pads single-digit months', () => {
    expect(monthKey(new Date('2024-03-01'))).toBe('2024-03')
  })
  it('uses current date when no argument', () => {
    const expected = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    expect(monthKey()).toBe(expected)
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth(0) returns first day of current month', () => {
    const result = startOfMonth(0)
    expect(result).toMatch(/^\d{4}-\d{2}-01$/)
  })
  it('endOfMonth(0) returns last day of current month', () => {
    const result = endOfMonth(0)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const day = parseInt(result.split('-')[2])
    expect(day).toBeGreaterThanOrEqual(28)
    expect(day).toBeLessThanOrEqual(31)
  })
  it('startOfMonth(-1) is before startOfMonth(0)', () => {
    expect(startOfMonth(-1) < startOfMonth(0)).toBe(true)
  })
})

describe('nDaysAgo', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(nDaysAgo(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('nDaysAgo(0) equals today', () => {
    expect(nDaysAgo(0)).toBe(todayISO())
  })
  it('nDaysAgo(1) is before today', () => {
    expect(nDaysAgo(1) < todayISO()).toBe(true)
  })
})

describe('daysAgo', () => {
  it('returns Today for current date', () => {
    expect(daysAgo(todayISO())).toBe('Today')
  })
  it('returns 1d ago for yesterday', () => {
    expect(daysAgo(nDaysAgo(1))).toBe('1d ago')
  })
  it('returns Nd ago for N days ago', () => {
    expect(daysAgo(nDaysAgo(5))).toBe('5d ago')
  })
})
