import { useAppStore } from '../../store/useAppStore'
import Transactions from './Transactions'
import Budget from './Budget'
import Accounts from './Accounts'
import Insights from './Insights'
import BottomSheet from '../../components/common/BottomSheet'
import TransactionForm from '../../components/forms/TransactionForm'
import { useState } from 'react'

const SUB_TABS = ['Transactions', 'Budget', 'Accounts', 'Insights']

export default function Money() {
  const { moneySubTab, setMoneySubTab } = useAppStore()
  const [addType, setAddType] = useState(null)

  const active = moneySubTab

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-card-border px-4 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        {SUB_TABS.map((tab) => {
          const isActive = active === tab.toLowerCase()
          return (
            <button key={tab} onPointerDown={() => setMoneySubTab(tab.toLowerCase())}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${isActive ? 'text-green border-green' : 'text-gray-500 border-transparent'}`}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {active === 'transactions' && <Transactions onAdd={(t) => setAddType(t)} />}
        {active === 'budget'       && <Budget />}
        {active === 'accounts'     && <Accounts />}
        {active === 'insights'     && <Insights />}
      </div>

      {/* Add transaction sheet */}
      <BottomSheet open={!!addType} onClose={() => setAddType(null)}
        title={addType === 'expense' ? 'Add Expense' : addType === 'income' ? 'Add Income' : 'Add Transfer'}>
        {addType && <TransactionForm type={addType} onClose={() => setAddType(null)} />}
      </BottomSheet>
    </div>
  )
}
