import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { useFinanceStore } from './store/useFinanceStore'
import { useAuthStore } from './store/useAuthStore'
import LoginScreen from './components/LoginScreen'
import PinLock from './components/PinLock'
import BottomNav from './components/layout/BottomNav'
import FAB from './components/layout/FAB'
import Overview from './pages/Overview'
import Wealth from './pages/Wealth/index'
import Money from './pages/Money/index'
import More from './pages/More'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import BottomSheet from './components/common/BottomSheet'
import TransactionForm from './components/forms/TransactionForm'

export default function App() {
  const { isLocked, pinSetupDone, activeTab, setActiveTab, checkInactivity, touchActivity } = useAppStore()
  const { init, loading } = useFinanceStore()
  const { user, authLoading, init: initAuth } = useAuthStore()
  const [innerPage, setInnerPage] = useState(null)
  const [fabAction, setFabAction] = useState(null)

  // Start auth listener
  useEffect(() => {
    const unsub = initAuth()
    return unsub
  }, [])

  // Init finance data once logged in
  useEffect(() => {
    if (user) init()
  }, [user])

  // Inactivity timer
  useEffect(() => {
    const interval = setInterval(checkInactivity, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Touch activity
  useEffect(() => {
    const onActivity = () => touchActivity()
    window.addEventListener('pointerdown', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity, { passive: true })
    window.addEventListener('scroll', onActivity, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('scroll', onActivity)
    }
  }, [])

  // Auth loading splash
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-green flex items-center justify-center">
            <span className="text-[#1a3d29] font-bold text-2xl">FC</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Not logged in → show login
  if (!user) return <LoginScreen />

  // Logged in but PIN not set or locked
  if (isLocked || !pinSetupDone) return <PinLock />

  // Finance data loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-green flex items-center justify-center">
            <span className="text-[#1a3d29] font-bold text-2xl">FC</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (innerPage === 'goals') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setInnerPage(null)} className="text-green text-sm font-medium">← Back</button>
        </div>
        <Goals />
      </div>
    )
  }

  if (innerPage === 'settings') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setInnerPage(null)} className="text-green text-sm font-medium">← Back</button>
        </div>
        <Settings />
      </div>
    )
  }

  const handleFabAction = (action) => {
    if (action === 'asset') { setActiveTab('wealth'); return }
    if (action === 'liability') { setActiveTab('wealth'); return }
    setFabAction(action)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'wealth'   && <Wealth />}
        {activeTab === 'money'    && <Money />}
        {activeTab === 'more'     && <More onNavigate={(p) => setInnerPage(p)} />}
      </div>

      <BottomNav />
      <FAB onAction={handleFabAction} />

      <BottomSheet
        open={!!fabAction}
        onClose={() => setFabAction(null)}
        title={fabAction === 'expense' ? 'Add Expense' : fabAction === 'income' ? 'Add Income' : 'Add Transfer'}>
        {fabAction && (
          <TransactionForm
            type={fabAction === 'transfer' ? 'transfer' : fabAction}
            onClose={() => setFabAction(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
