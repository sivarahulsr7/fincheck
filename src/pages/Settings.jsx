import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useFinanceStore } from '../store/useFinanceStore'
import { ChevronRight, Shield, Eye, EyeOff, Fingerprint, Info, Delete, TrendingUp } from 'lucide-react'
import BottomSheet from '../components/common/BottomSheet'
import {
  isBiometricAvailable, isBiometricRegistered, registerBiometric, clearBiometric
} from '../utils/biometric'
import { useAuthStore } from '../store/useAuthStore'

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function Settings({ onBack }) {
  const { pinSetupDone, setPin, verifyPin, balancesHidden, toggleBalances, lock, biometricEnabled, setBiometricEnabled } = useAppStore()
  const { user } = useAuthStore()
  const { transactions, convertInvestmentsToAssets } = useFinanceStore()
  const investmentCount = transactions.filter((t) => t.categoryId === 'investment' && t.type === 'expense').length
  const [showMigrate, setShowMigrate] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migratedCount, setMigratedCount] = useState(null)
  const [showPinChange, setShowPinChange] = useState(false)
  const [biometricAvail, setBiometricAvail] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => { isBiometricAvailable().then(setBiometricAvail) }, [])

  const handleBiometricToggle = async () => {
    if (biometricEnabled) { clearBiometric(); setBiometricEnabled(false); return }
    if (!biometricAvail) return
    setBiometricLoading(true)
    try {
      await registerBiometric(user?.uid || 'fincheck')
      setBiometricEnabled(true)
    } catch { /* user cancelled */ } finally {
      setBiometricLoading(false)
    }
  }

  // PIN numpad state
  const [pinInput, setPinInput] = useState('')
  const [pinStep, setPinStep] = useState(1)
  const [pinBuffer, setPinBuffer] = useState('')
  const [pinError, setPinError] = useState('')

  // Step 0 = verify current PIN (only when one is already set), 1 = enter new,
  // 2 = confirm new.
  const resetPinSheet = () => {
    setPinInput(''); setPinStep(pinSetupDone ? 0 : 1); setPinBuffer(''); setPinError('')
    setShowPinChange(false)
  }

  const handlePinDigit = async (d) => {
    if (pinInput.length >= 4) return
    const next = pinInput + d
    setPinInput(next)
    if (next.length !== 4) return

    if (pinStep === 0) {
      if (await verifyPin(next)) {
        setPinInput(''); setPinStep(1); setPinError('')
      } else {
        setPinError('Incorrect current PIN.'); setPinInput('')
      }
    } else if (pinStep === 1) {
      setPinBuffer(next); setPinInput(''); setPinStep(2); setPinError('')
    } else {
      if (next === pinBuffer) {
        await setPin(next)
        resetPinSheet()
      } else {
        setPinError('PINs do not match. Try again.')
        setPinInput(''); setPinBuffer(''); setPinStep(1)
      }
    }
  }

  const handleMigrate = async () => {
    setMigrating(true)
    const n = await convertInvestmentsToAssets()
    setMigratedCount(n)
    setMigrating(false)
  }

  const rows = [
    {
      group: 'Security',
      items: [
        {
          icon: <Shield size={16} className="text-green" />,
          label: 'Change PIN',
          sublabel: pinSetupDone ? 'Change your 4-digit PIN' : 'Set up a PIN',
          action: () => { resetPinSheet(); setShowPinChange(true) },
        },
        ...(biometricAvail ? [{
          icon: <Fingerprint size={16} className={biometricEnabled ? 'text-green' : 'text-gray-400'} />,
          label: 'Face ID / Touch ID',
          sublabel: biometricLoading ? 'Setting up…' : biometricEnabled ? 'Enabled — tap to disable' : isBiometricRegistered() ? 'Re-register biometric' : 'Tap to enable',
          toggle: true,
          value: biometricEnabled,
          onToggle: handleBiometricToggle,
        }] : []),
        {
          icon: <Shield size={16} className="text-orange-400" />,
          label: 'Lock Now',
          sublabel: 'Immediately lock the app',
          action: lock,
        },
      ]
    },
    {
      group: 'Display',
      items: [
        {
          icon: balancesHidden ? <EyeOff size={16} className="text-blue-400" /> : <Eye size={16} className="text-blue-400" />,
          label: 'Hide Balances',
          sublabel: balancesHidden ? 'Balances are hidden' : 'Balances are visible',
          toggle: true,
          value: balancesHidden,
          onToggle: toggleBalances,
        },
      ]
    },
    {
      group: 'Data',
      items: [
        {
          icon: <TrendingUp size={16} className="text-green" />,
          label: 'Convert Investment Expenses',
          sublabel: investmentCount > 0
            ? `${investmentCount} investment transaction${investmentCount !== 1 ? 's' : ''} → Assets`
            : 'No investment expenses found',
          action: () => setShowMigrate(true),
        },
      ]
    },
    {
      group: 'About',
      items: [
        {
          icon: <Info size={16} className="text-gray-400" />,
          label: 'Fin Check',
          sublabel: 'v1.0.0 · Personal Finance Manager',
          action: null,
        },
      ]
    }
  ]

  return (
    <div className="page-content px-4 pt-4">
      <div className="flex items-center gap-3 mb-5" style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}>
        {onBack && (
          <button onClick={onBack} className="text-green text-sm font-medium mr-1">← Back</button>
        )}
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {rows.map((group) => (
        <div key={group.group} className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2 px-1">{group.group}</p>
          <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
            {group.items.map((item, i) => (
              <button key={i} onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-card-border last:border-0 text-left"
                disabled={!item.action && !item.toggle}>
                <div className="w-8 h-8 rounded-lg bg-card-2 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-gray-500 mt-0.5">{item.sublabel}</p>}
                </div>
                {item.toggle ? (
                  <div onClick={(e) => { e.stopPropagation(); item.onToggle() }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${item.value ? 'bg-green' : 'bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${item.value ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                ) : item.action ? (
                  <ChevronRight size={16} className="text-gray-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Investment migration sheet */}
      <BottomSheet open={showMigrate} onClose={() => { setShowMigrate(false); setMigratedCount(null) }}
        title="Convert Investments to Assets">
        {migratedCount !== null ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-green-tint flex items-center justify-center">
              <TrendingUp size={24} className="text-green" />
            </div>
            <p className="text-white font-semibold text-center">
              {migratedCount} investment{migratedCount !== 1 ? 's' : ''} converted to assets
            </p>
            <p className="text-gray-400 text-sm text-center">
              You can now see and edit them in Wealth → Assets.
            </p>
            <button onClick={() => { setShowMigrate(false); setMigratedCount(null) }}
              className="w-full py-3.5 rounded-xl bg-green text-[#1a3d29] font-semibold text-sm">
              Done
            </button>
          </div>
        ) : investmentCount === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-gray-400 text-sm">No transactions with the "Investment" expense category were found.</p>
            <button onClick={() => setShowMigrate(false)}
              className="w-full py-3 rounded-xl bg-card-2 text-gray-300 font-medium text-sm">Close</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-gray-400 text-sm">
              This will convert <span className="text-white font-semibold">{investmentCount} investment expense{investmentCount !== 1 ? 's' : ''}</span> into equity assets.
            </p>
            <ul className="text-xs text-gray-500 space-y-1.5">
              <li>· Each investment becomes an asset with the same name and amount</li>
              <li>· Your account balances stay unchanged (money correctly left the account)</li>
              <li>· The original expense transactions are removed</li>
            </ul>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowMigrate(false)}
                className="flex-1 py-3 rounded-xl bg-card-2 text-gray-300 font-medium text-sm">Cancel</button>
              <button onClick={handleMigrate} disabled={migrating}
                className="flex-1 py-3 rounded-xl bg-green text-[#1a3d29] font-semibold text-sm">
                {migrating ? 'Converting…' : 'Convert All'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* PIN change sheet — uses same numpad as lock screen */}
      <BottomSheet open={showPinChange} onClose={resetPinSheet}
        title={pinStep === 0 ? 'Enter Current PIN' : pinStep === 1 ? 'Enter New PIN' : 'Confirm PIN'}>
        <div className="flex flex-col items-center gap-6 py-2">
          <p className="text-xs text-gray-500">
            {pinStep === 0 ? 'Verify your current 4-digit PIN' : pinStep === 1 ? 'Enter a new 4-digit PIN' : 'Enter it again to confirm'}
          </p>

          {/* Dots */}
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`pin-dot ${pinInput.length > i ? 'filled' : ''}`} />
            ))}
          </div>

          {pinError && <p className="text-red text-xs">{pinError}</p>}

          {/* Numpad */}
          <div className="flex flex-col gap-3">
            {[KEYS.slice(0, 3), KEYS.slice(3, 6), KEYS.slice(6, 9)].map((row, ri) => (
              <div key={ri} className="flex gap-3">
                {row.map((d) => (
                  <button key={d} className="numpad-btn" onPointerDown={() => handlePinDigit(String(d))}>
                    {d}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex gap-3">
              <div className="numpad-btn opacity-0 pointer-events-none" />
              <button className="numpad-btn" onPointerDown={() => handlePinDigit('0')}>0</button>
              <button className="numpad-btn" onPointerDown={() => setPinInput(s => s.slice(0, -1))}>
                <Delete size={22} />
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
