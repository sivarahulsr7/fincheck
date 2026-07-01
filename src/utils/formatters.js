// ── Local-time date helpers ────────────────────────────────────────────────
// All date stamps and boundaries use LOCAL calendar fields (matching
// DatePicker), never UTC toISOString(). Mixing the two shifts the day for
// users in non-UTC zones (e.g. a 1 AM IST entry lands on the previous day).

// Format a Date as YYYY-MM-DD using local fields.
export const toISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Parse a YYYY-MM-DD string as a local Date (avoids UTC-midnight parsing).
export const parseLocal = (str) => {
  if (!str) return new Date()
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const fmt = (amount, compact = false) => {
  if (amount === undefined || amount === null) return '₹0'
  const value = Number(amount)
  if (!Number.isFinite(value)) return '₹0'
  const num = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  // Indian units: 1 crore = 1,00,00,000; 1 lakh = 1,00,000.
  if (compact && num >= 1_00_00_000) return `${sign}₹${(num / 1_00_00_000).toFixed(1)}Cr`
  if (compact && num >= 1_00_000) return `${sign}₹${(num / 1_00_000).toFixed(1)}L`
  if (compact && num >= 1_000) return `${sign}₹${(num / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const fmtCompact = (amount) => fmt(amount, true)

export const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return parseLocal(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const fmtMonth = (dateStr) => {
  if (!dateStr) return ''
  return parseLocal(dateStr).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export const fmtPct = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '0.0%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(1)}%`
}

export const todayISO = () => toISO(new Date())

export const monthKey = (date = new Date()) => {
  const d = typeof date === 'string' ? parseLocal(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const startOfMonth = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return toISO(d)
}

export const endOfMonth = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 0)
  return toISO(d)
}

export const daysAgo = (dateStr) => {
  const diff = Date.now() - parseLocal(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export const nDaysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}
