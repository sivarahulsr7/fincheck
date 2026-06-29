import { LayoutDashboard, TrendingUp, Wallet, MoreHorizontal } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'wealth',   label: 'Wealth',   Icon: TrendingUp },
  { id: 'money',    label: 'Money',    Icon: Wallet },
  { id: 'more',     label: 'More',     Icon: MoreHorizontal },
]

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <nav className="nav-bar">
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                className={active ? 'text-green' : 'text-gray-500'}
              />
              <span className={`text-[10px] font-medium ${active ? 'text-green' : 'text-gray-500'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
