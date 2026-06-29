import { useAppStore } from '../../store/useAppStore'
import { fmt } from '../../utils/formatters'

export default function Amount({ value, className = '', compact = false, showSign = false }) {
  const hidden = useAppStore((s) => s.balancesHidden)

  if (hidden) return <span className={`amount-hidden ${className}`} />

  const formatted = compact
    ? fmt(Math.abs(value), true)
    : fmt(value)

  const sign = showSign && value > 0 ? '+' : ''
  return <span className={className}>{sign}{formatted}</span>
}
