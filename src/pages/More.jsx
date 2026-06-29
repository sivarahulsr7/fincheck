import { Shield, Target, TrendingUp, BarChart2, Settings, Eye, EyeOff, Sun, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const MENU_ITEMS = [
  { id: 'essentials', label: 'Essentials', icon: Shield,     color: '#4CAF76' },
  { id: 'goals',      label: 'Goals',      icon: Target,     color: '#F97316' },
  { id: 'networth',   label: 'Net Worth',  icon: TrendingUp, color: '#3B82F6' },
  { id: 'insights',   label: 'Insights',   icon: BarChart2,  color: '#A855F7' },
  { id: 'settings',   label: 'Settings',   icon: Settings,   color: '#9CA3AF' },
  { id: 'import',     label: 'Import',     icon: Download,   color: '#06B6D4' },
]

export default function More({ onNavigate }) {
  const { balancesHidden, toggleBalances, setActiveTab, setMoneySubTab, setWealthSubTab } = useAppStore()

  const handleItem = (id) => {
    if (id === 'goals') onNavigate?.('goals')
    else if (id === 'networth') { setActiveTab('wealth'); setWealthSubTab('net-worth') }
    else if (id === 'insights') { setActiveTab('money'); setMoneySubTab('insights') }
    else if (id === 'settings') onNavigate?.('settings')
    else if (id === 'essentials') onNavigate?.('essentials')
    else if (id === 'import') onNavigate?.('import')
  }

  return (
    <div className="page-content px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      {/* Grid menu */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {MENU_ITEMS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => handleItem(id)}
            className="bg-card rounded-2xl border border-card-border p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: color + '22' }}>
              <Icon size={22} style={{ color }} />
            </div>
            <span className="text-xs text-gray-300 font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Bottom toggles */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden mb-4">
        <button onClick={toggleBalances} className="w-full flex items-center gap-3 px-4 py-4 border-b border-card-border">
          {balancesHidden
            ? <EyeOff size={18} className="text-gray-400" />
            : <Eye size={18} className="text-gray-400" />
          }
          <span className="text-sm text-gray-300">{balancesHidden ? 'Show totals' : 'Hide totals'}</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-4">
          <Sun size={18} className="text-gray-400" />
          <span className="text-sm text-gray-300">Light mode (follows system)</span>
        </button>
      </div>

      {/* App info */}
      <div className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green flex items-center justify-center">
          <span className="text-[#1a3d29] font-bold text-sm">FC</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fin Check</p>
          <p className="text-xs text-gray-500">Personal Finance Manager</p>
        </div>
      </div>
    </div>
  )
}
