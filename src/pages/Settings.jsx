import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ChevronRight, Shield, Eye, EyeOff, Fingerprint, Info } from 'lucide-react'
import BottomSheet from '../components/common/BottomSheet'
import {
  isBiometricAvailable, isBiometricRegistered, registerBiometric, clearBiometric
} from '../utils/biometric'
import { useAuthStore } from '../store/useAuthStore'

export default function Settings() {
  const { pin, pinSetupDone, setPin, balancesHidden, toggleBalances, lock, biometricEnabled, setBiometricEnabled } = useAppStore()
  const { user } = useAuthStore()
  const [showPinChange, setShowPinChange] = useState(false)
  const [biometricAvail, setBiometricAvail] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => { isBiometricAvailable().then(setBiometricAvail) }, [])

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      clearBiometric()
      setBiometricEnabled(false)
      return
    }
    if (!biometricAvail) return
    setBiometricLoading(true)
    try {
      await registerBiometric(user?.uid || 'fincheck')
      setBiometricEnabled(true)
    } catch {
      // User cancelled or unavailable — silently ignore
    } finally {
      setBiometricLoading(false)
    }
  }
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  const handlePinNext = () => {
    if (newPin.length !== 4) { setError('PIN must be 4 digits'); return }
    setStep(2); setError('')
  }

  const handlePinSave = () => {
    if (newPin !== confirmPin) { setError('PINs do not match'); return }
    setPin(newPin)
    setShowPinChange(false)
    setNewPin(''); setConfirmPin(''); setStep(1); setError('')
  }

  const rows = [
    {
      group: 'Security',
      items: [
        {
          icon: <Shield size={16} className="text-green" />,
          label: 'Change PIN',
          sublabel: pinSetupDone ? 'Change your 4-digit PIN' : 'Set up a PIN',
          action: () => setShowPinChange(true),
        },
        ...(biometricAvail ? [{
          icon: <Fingerprint size={16} className={biometricEnabled ? 'text-green' : 'text-gray-400'} />,
          label: 'Face ID / Touch ID',
          sublabel: biometricLoading
            ? 'Setting up…'
            : biometricEnabled
              ? 'Enabled — tap to disable'
              : isBiometricRegistered()
                ? 'Re-register biometric'
                : 'Tap to enable',
          toggle: true,
          value: biometricEnabled,
          onToggle: handleBiometricToggle,
        }] : []),
        {
          icon: <Shield size={16} className="text-orange" />,
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
          icon: balancesHidden ? <EyeOff size={16} className="text-blue" /> : <Eye size={16} className="text-blue" />,
          label: 'Hide Balances',
          sublabel: balancesHidden ? 'Balances are hidden' : 'Balances are visible',
          toggle: true,
          value: balancesHidden,
          onToggle: toggleBalances,
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

  const inputCls = 'w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green tracking-widest text-center text-xl font-bold'

  return (
    <div className="page-content px-4 pt-4">
      <h1 className="text-xl font-bold text-white mb-4">Settings</h1>

      {rows.map((group) => (
        <div key={group.group} className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2 px-1">{group.group}</p>
          <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
            {group.items.map((item, i) => (
              <button key={i}
                onClick={item.action}
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
                  <div
                    onClick={(e) => { e.stopPropagation(); item.onToggle() }}
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

      {/* PIN change sheet */}
      <BottomSheet open={showPinChange} onClose={() => { setShowPinChange(false); setNewPin(''); setConfirmPin(''); setStep(1); setError('') }}
        title={step === 1 ? 'Enter New PIN' : 'Confirm PIN'}>
        <div className="flex flex-col gap-4">
          {step === 1 ? (
            <>
              <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={inputCls} />
              {error && <p className="text-red text-xs text-center">{error}</p>}
              <button onClick={handlePinNext} disabled={newPin.length !== 4}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm ${newPin.length === 4 ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
                Next
              </button>
            </>
          ) : (
            <>
              <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={inputCls} />
              {error && <p className="text-red text-xs text-center">{error}</p>}
              <button onClick={handlePinSave} disabled={confirmPin.length !== 4}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm ${confirmPin.length === 4 ? 'bg-green text-[#1a3d29]' : 'bg-card-2 text-gray-600'}`}>
                Save PIN
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
