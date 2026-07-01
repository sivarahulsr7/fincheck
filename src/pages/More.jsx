import { Target, TrendingUp, BarChart2, Settings, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import AppHeader from '../components/layout/AppHeader'

const MENU_ITEMS = [
  { id: 'goals',    label: 'Goals',     icon: Target,    color: '#F97316' },
  { id: 'networth', label: 'Net Worth', icon: TrendingUp, color: '#3B82F6' },
  { id: 'insights', label: 'Insights',  icon: BarChart2,  color: '#A855F7' },
  { id: 'settings', label: 'Settings',  icon: Settings,   color: '#9CA3AF' },
  { id: 'import',   label: 'Import',    icon: Download,   color: '#06B6D4' },
]

export default function More({ onNavigate }) {
  const { setActiveTab, setMoneySubTab, setWealthSubTab } = useAppStore()

  const handleItem = (id) => {
    if (id === 'goals') onNavigate?.('goals')
    else if (id === 'networth') { setActiveTab('wealth'); setWealthSubTab('net-worth') }
    else if (id === 'insights') { setActiveTab('money'); setMoneySubTab('insights') }
    else if (id === 'settings') onNavigate?.('settings')
    else if (id === 'import') onNavigate?.('import')
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="More" />
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
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

      <div className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green flex items-center justify-center">
          <span className="text-[#1a3d29] font-bold text-sm">FC</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fin Check</p>
          <p className="text-xs text-gray-500">v1.0.0 · Personal Finance Manager</p>
        </div>
      </div>
      </div>
    </div>
  )
}
