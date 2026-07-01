import { useAppStore } from '../../store/useAppStore'
import { fmt } from '../../utils/formatters'

export default function Amount({ value, className = '', compact = false, showSign = false }) {
  const hidden = useAppStore((s) => s.balancesHidden)

  if (hidden) {
    // Strip semantic gain/loss colors so the mask doesn't leak the sign.
    const neutral = className.replace(/\btext-(red|green)\S*/g, '').trim()
    return <span className={`amount-hidden ${neutral}`} />
  }

  const formatted = fmt(value, compact)
  const sign = showSign && value > 0 ? '+' : ''
  return <span className={className}>{sign}{formatted}</span>
}
