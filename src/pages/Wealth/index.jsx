import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import Assets from './Assets'
import Liabilities from './Liabilities'
import NetWorthHistory from './NetWorthHistory'
import Allocation from './Allocation'

const SUB_TABS = ['Assets', 'Liabilities', 'Net Worth', 'Allocation']

export default function Wealth() {
  const { wealthSubTab, setWealthSubTab } = useAppStore()
  const active = wealthSubTab

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-card-border px-4 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        {SUB_TABS.map((tab) => {
          const key = tab.toLowerCase().replace(' ', '-')
          const isActive = active === key
          return (
            <button key={tab} onPointerDown={() => setWealthSubTab(key)}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${isActive ? 'text-green border-green' : 'text-gray-500 border-transparent'}`}>
              {tab}
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {active === 'assets'      && <Assets />}
        {active === 'liabilities' && <Liabilities />}
        {active === 'net-worth'   && <NetWorthHistory />}
        {active === 'allocation'  && <Allocation />}
      </div>
    </div>
  )
}
