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
import Import from './pages/Import'
import TransactionForm from './components/forms/TransactionForm'
import AssetForm from './components/forms/AssetForm'
import LiabilityForm from './components/forms/LiabilityForm'

export default function App() {
  const { isLocked, pinSetupDone, activeTab, setActiveTab, touchActivity, lock } = useAppStore()
  const { init, loading } = useFinanceStore()
  const { user, authLoading, init: initAuth } = useAuthStore()
  const [innerPage, setInnerPage] = useState(null)
  const [fabAction, setFabAction] = useState(null)

  // Lock when app comes back from background
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && pinSetupDone) lock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [pinSetupDone])

  // Start auth listener
  useEffect(() => {
    const unsub = initAuth()
    return unsub
  }, [])

  // Init finance data once logged in
  useEffect(() => {
    if (user) init()
  }, [user])

  // Track activity (keeps lastActive fresh, no inactivity locking)
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

  const Splash = () => (
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

  // Show PIN screen immediately (isLocked starts true) — auth loads in background
  // This eliminates the 2-3s splash in standalone PWA mode
  if (isLocked || !pinSetupDone) return <PinLock />
  if (authLoading) return <Splash />
  if (!user) return <LoginScreen />
  if (loading) return <Splash />

  const BackHeader = ({ onBack }) => (
    <div className="flex items-center gap-3 px-4 pb-2 flex-shrink-0"
         style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      <button onClick={onBack} className="text-green text-sm font-medium">← Back</button>
    </div>
  )

  if (innerPage === 'goals') return (
    <div className="flex flex-col h-full">
      <BackHeader onBack={() => setInnerPage(null)} />
      <Goals />
    </div>
  )

  if (innerPage === 'settings') return (
    <div className="flex flex-col h-full">
      <BackHeader onBack={() => setInnerPage(null)} />
      <Settings />
    </div>
  )

  if (innerPage === 'import') return (
    <div className="flex flex-col h-full">
      <BackHeader onBack={() => setInnerPage(null)} />
      <Import />
    </div>
  )

  const handleFabAction = (action) => setFabAction(action)

  const FAB_PAGES = {
    expense:   { label: 'Add Expense',   form: <TransactionForm type="expense"   onClose={() => setFabAction(null)} /> },
    income:    { label: 'Add Income',    form: <TransactionForm type="income"    onClose={() => setFabAction(null)} /> },
    transfer:  { label: 'Add Transfer',  form: <TransactionForm type="transfer"  onClose={() => setFabAction(null)} /> },
    asset:     { label: 'Add Asset',     form: <AssetForm       onClose={() => setFabAction(null)} /> },
    liability: { label: 'Add Liability', form: <LiabilityForm   onClose={() => setFabAction(null)} /> },
  }

  if (fabAction && FAB_PAGES[fabAction]) {
    const { label, form } = FAB_PAGES[fabAction]
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
             style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
          <button onClick={() => setFabAction(null)} className="text-green text-sm font-medium">← Back</button>
          <span className="text-white font-semibold text-sm">{label}</span>
        </div>
        <div className="page-content px-4 pt-2">{form}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'overview' && <Overview onNavigate={setInnerPage} onFabAction={setFabAction} />}
        {activeTab === 'wealth'   && <Wealth />}
        {activeTab === 'money'    && <Money />}
        {activeTab === 'more'     && <More onNavigate={(p) => setInnerPage(p)} />}
      </div>

      <BottomNav />
      <FAB onAction={handleFabAction} />
    </div>
  )
}
