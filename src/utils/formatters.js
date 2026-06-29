export const fmt = (amount, compact = false) => {
  if (amount === undefined || amount === null) return '₹0'
  const num = Math.abs(Number(amount))
  if (compact && num >= 10_00_000) return `₹${(num / 10_00_000).toFixed(1)}L`
  if (compact && num >= 1_000) return `₹${(num / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const fmtCompact = (amount) => fmt(amount, true)

export const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const fmtMonth = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export const fmtPct = (value) => {
  if (!value && value !== 0) return ''
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(1)}%`
}

export const todayISO = () => new Date().toISOString().split('T')[0]

export const monthKey = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const startOfMonth = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export const endOfMonth = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d.toISOString().split('T')[0]
}

export const daysAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export const nDaysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
