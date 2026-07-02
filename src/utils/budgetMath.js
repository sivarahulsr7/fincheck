// Budget math helpers (pure, unit-tested).

export const OVERALL = '__overall__' // categoryId sentinel for a whole-month budget

// The effective limit for a budget in a given month:
//  - % of income (BUD-6) if pctOfIncome set, else the fixed limit
//  - plus any rolled-over unspent amount from last month (BUD-2), never negative
export function effectiveLimit(b, { income = 0, carry = 0 } = {}) {
  if (!b) return 0
  const base = b.pctOfIncome != null && Number(b.pctOfIncome) > 0
    ? Math.round((Number(income) || 0) * Number(b.pctOfIncome) / 100)
    : (Number(b.limit) || 0)
  const roll = b.rollover ? Math.max(0, Number(carry) || 0) : 0
  return base + roll
}

// Usage state for a budget given spent + effective limit.
export function budgetStatus(spent, limit) {
  const s = Number(spent) || 0
  const l = Number(limit) || 0
  const pct = l > 0 ? (s / l) * 100 : 0
  return {
    pct,
    over: l > 0 && s > l,
    near: l > 0 && s <= l && pct >= 80, // 80%+ but not yet over
    remaining: l - s,
  }
}
