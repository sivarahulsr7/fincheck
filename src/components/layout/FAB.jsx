import { useState } from 'react'
import { Plus, X, ArrowUpRight, ArrowDownLeft, Coins, Landmark } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const FAB_ACTIONS = [
  { id: 'expense',   label: 'Expense',   Icon: ArrowUpRight,   color: '#E05252' },
  { id: 'income',    label: 'Income',    Icon: ArrowDownLeft,  color: '#4CAF76' },
  { id: 'asset',     label: 'Asset',     Icon: Coins,          color: '#3B82F6' },
  { id: 'liability', label: 'Liability', Icon: Landmark,       color: '#E05252' },
]

export default function FAB({ onAction }) {
  const [open, setOpen] = useState(false)
  const activeTab = useAppStore((s) => s.activeTab)

  const toggle = () => setOpen((o) => !o)

  const handleAction = (id) => {
    setOpen(false)
    onAction?.(id)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 34 }} onClick={() => setOpen(false)} />
      )}

      {open && (
        <div
          className="fixed flex flex-col gap-2 slide-up"
          style={{
            zIndex: 35,
            bottom: `calc(134px + env(safe-area-inset-bottom))`,
            right: `max(16px, calc((100vw - 480px) / 2 + 16px))`,
          }}
        >
          {FAB_ACTIONS.map(({ id, label, Icon, color }) => (
            <button
              key={id}
              onClick={() => handleAction(id)}
              className="flex items-center gap-3 px-4 py-3 rounded-full text-white text-sm font-medium shadow-lg"
              style={{ background: '#1c1c1e', border: '1px solid #2a2a2a', minWidth: 140 }}
            >
              <Icon size={16} style={{ color }} />
              {label}
            </button>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={toggle}
        style={{ zIndex: 36 }}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </>
  )
}
