import { parseLocal } from './formatters'

// Absolute return % = (current − invested) / invested.
export function absoluteReturnPct(invested, current) {
  const inv = Number(invested) || 0
  if (inv <= 0) return null
  return ((Number(current) || 0) - inv) / inv * 100
}

// Years between a purchase date and now (fractional), for annualizing.
export function yearsHeld(purchaseISO, now = new Date()) {
  if (!purchaseISO) return null
  const d = parseLocal(purchaseISO)
  const ms = now.getTime() - d.getTime()
  if (ms <= 0) return 0
  return ms / (365.25 * 24 * 3600 * 1000)
}

// CAGR = (current/invested)^(1/years) − 1, in %. Needs a purchase date and a
// meaningful holding period (≥ ~1 month); otherwise not shown.
export function cagrPct(invested, current, purchaseISO, now = new Date()) {
  const inv = Number(invested) || 0
  const cur = Number(current) || 0
  if (inv <= 0 || cur <= 0) return null
  const years = yearsHeld(purchaseISO, now)
  if (years == null || years < 0.08) return null // < ~1 month → absolute only
  return (Math.pow(cur / inv, 1 / years) - 1) * 100
}
