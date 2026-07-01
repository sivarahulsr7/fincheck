import { Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

// Consistent top header across pages: section label + "Fin Check" + the
// hide-balances toggle (optionally extra action buttons on the right).
export default function AppHeader({ title, actions = null }) {
  const balancesHidden = useAppStore((s) => s.balancesHidden)
  const toggleBalances = useAppStore((s) => s.toggleBalances)
  return (
    <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
         style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      <div>
        <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">{title}</p>
        <p className="text-base font-bold text-white leading-tight mt-0.5">Fin Check</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleBalances}
          aria-label={balancesHidden ? 'Show balances' : 'Hide balances'}
          className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400">
          {balancesHidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {actions}
      </div>
    </div>
  )
}
