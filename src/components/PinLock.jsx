import { useState, useEffect } from 'react'
import { Delete, Fingerprint } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  isBiometricAvailable,
  isBiometricRegistered,
  registerBiometric,
  authenticateWithBiometric,
} from '../utils/biometric'

export default function PinLock() {
  const { pin, pinSetupDone, isLocked, setPin, unlock, wrongPin, wrongAttempts, biometricEnabled, setBiometricEnabled } = useAppStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState('enter')
  const [shake, setShake] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [biometricAvail, setBiometricAvail] = useState(false)

  useEffect(() => {
    if (!pinSetupDone) setStep('setup')
    else setStep('enter')
    setInput('')
    setConfirmPin('')
    setErrorMsg('')
  }, [pinSetupDone, isLocked])

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvail)
  }, [])

  // Auto-trigger biometric when locked and enabled
  useEffect(() => {
    if (step === 'enter' && biometricEnabled && isBiometricRegistered()) {
      triggerBiometric()
    }
  }, [step, biometricEnabled])

  const triggerBiometric = async () => {
    try {
      await authenticateWithBiometric()
      unlock()
    } catch (e) {
      // Credential was cleared (stale/mismatched) — also disable in store so it stops retrying
      if (!isBiometricRegistered()) {
        setBiometricEnabled(false)
      }
      const cancelled = e.name === 'NotAllowedError' && isBiometricRegistered()
      setErrorMsg(cancelled ? 'Biometric cancelled. Enter your PIN.' : 'Biometric unavailable. Enter your PIN.')
    }
  }

  const doShake = (msg = '') => {
    setShake(true)
    setErrorMsg(msg)
    setInput('')
    setTimeout(() => setShake(false), 500)
  }

  const handleDigit = (d) => {
    if (input.length >= 4) return
    const next = input + d

    if (step === 'setup') {
      setInput(next)
      if (next.length === 4) {
        setConfirmPin(next)
        setInput('')
        setStep('confirm')
      }
    } else if (step === 'confirm') {
      setInput(next)
      if (next.length === 4) {
        if (next === confirmPin) {
          setPin(next)
          // After PIN setup, offer biometrics
          if (biometricAvail) setShowBiometricPrompt(true)
        } else {
          doShake('PINs do not match. Try again.')
          setConfirmPin('')
          setStep('setup')
        }
      }
    } else {
      setInput(next)
      if (next.length === 4) {
        if (next === pin) {
          unlock()
        } else {
          wrongPin()
          doShake(wrongAttempts + 1 >= 3 ? 'PIN reset. Set a new PIN.' : 'Wrong PIN')
        }
      }
    }
  }

  const handleDelete = () => setInput((s) => s.slice(0, -1))

  const handleEnableBiometric = async () => {
    try {
      await registerBiometric(user?.uid || 'fincheck')
      setBiometricEnabled(true)
      setShowBiometricPrompt(false)
      unlock()
    } catch {
      setShowBiometricPrompt(false)
      unlock()
    }
  }

  const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  const label =
    step === 'setup'   ? 'Set a 4-digit PIN' :
    step === 'confirm' ? 'Confirm your PIN' :
    'Enter your PIN'

  const subtitle =
    step === 'setup'   ? "You'll use this to unlock Fin Check" :
    step === 'confirm' ? 'Enter your PIN again to confirm' : ''

  // Biometric setup prompt after PIN is set
  if (showBiometricPrompt) {
    return (
      <div className="fixed inset-0 bg-[#111] flex flex-col items-center justify-center px-8 z-50"
           style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-16 h-16 rounded-2xl bg-green/20 flex items-center justify-center mb-6">
          <Fingerprint size={32} className="text-green" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 text-center">Enable Face ID / Touch ID?</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Use biometrics to unlock Fin Check instantly. You can still use your PIN as backup.
        </p>
        <button
          onClick={handleEnableBiometric}
          className="w-full bg-green text-[#0a2010] font-semibold py-3.5 rounded-xl mb-3">
          Enable Biometrics
        </button>
        <button
          onClick={() => { setShowBiometricPrompt(false); unlock() }}
          className="w-full text-gray-400 py-3 text-sm">
          Skip, use PIN only
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#111] flex flex-col items-center justify-between z-50"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-col items-center mt-16 gap-4">
        <div className="w-20 h-20 rounded-2xl bg-green flex items-center justify-center shadow-lg">
          <span className="text-[#1a3d29] font-bold text-3xl tracking-tight">FC</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mt-2">
            {step === 'enter' ? 'Fin Check is Locked' : 'Fin Check'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{label}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>

        <div className={`flex gap-4 mt-4`}
             style={shake ? { animation: 'shake 0.4s ease-in-out' } : {}}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${input.length > i ? 'filled' : ''}`} />
          ))}
        </div>
        {errorMsg && <p className="text-red text-xs mt-2">{errorMsg}</p>}
      </div>

      <div className="flex flex-col items-center gap-3 mb-8">
        {[KEYS.slice(0, 3), KEYS.slice(3, 6), KEYS.slice(6, 9)].map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {row.map((d) => (
              <button key={d} className="numpad-btn" onPointerDown={() => handleDigit(String(d))}>
                {d}
              </button>
            ))}
          </div>
        ))}
        <div className="flex gap-3">
          {/* Biometric button (bottom left) */}
          {step === 'enter' && biometricEnabled && biometricAvail ? (
            <button className="numpad-btn" onPointerDown={triggerBiometric}>
              <Fingerprint size={22} />
            </button>
          ) : (
            <div className="numpad-btn opacity-0 pointer-events-none" />
          )}
          <button className="numpad-btn" onPointerDown={() => handleDigit('0')}>0</button>
          <button className="numpad-btn" onPointerDown={handleDelete}>
            <Delete size={24} />
          </button>
        </div>

        {step === 'enter' && (
          <p className="text-gray-500 text-xs mt-2 text-center px-8">
            Forgot PIN? Enter incorrectly 3 times to reset
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
