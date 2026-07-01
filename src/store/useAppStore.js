import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PIN_RESET_ATTEMPTS } from '../utils/constants'

export const useAppStore = create(
  persist(
    (set, get) => ({
      pin: null,
      pinSetupDone: false,
      isLocked: true,
      lastActive: Date.now(),
      wrongAttempts: 0,
      biometricEnabled: false,

      balancesHidden: true,
      activeTab: 'overview',
      moneySubTab: 'transactions',
      wealthSubTab: 'assets',

      setPin: (pin) => set({ pin, pinSetupDone: true, isLocked: false }),
      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false, wrongAttempts: 0, lastActive: Date.now() }),
      // On too many wrong attempts, clear the PIN and biometric but KEEP the
      // app locked (isLocked stays true, pinSetupDone becomes false). Because
      // setting up a PIN now requires an authenticated user (see App.jsx) and
      // PinLock signs the user out on reset, a new PIN can only be set after
      // re-authenticating with Google — so failed attempts never grant access.
      // Returns true when a reset was triggered.
      wrongPin: () => {
        const next = get().wrongAttempts + 1
        if (next >= PIN_RESET_ATTEMPTS) {
          set({ pin: null, pinSetupDone: false, isLocked: true, wrongAttempts: 0, biometricEnabled: false })
          localStorage.removeItem('fincheck-biometric-id')
          return true
        }
        set({ wrongAttempts: next })
        return false
      },

      setBiometricEnabled: (val) => set({ biometricEnabled: val }),

      touchActivity: () => set({ lastActive: Date.now() }),
      toggleBalances: () => set((s) => ({ balancesHidden: !s.balancesHidden })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMoneySubTab: (tab) => set({ moneySubTab: tab }),
      setWealthSubTab: (tab) => set({ wealthSubTab: tab }),
    }),
    {
      name: 'fincheck-app',
      partialize: (s) => ({
        pin: s.pin,
        pinSetupDone: s.pinSetupDone,
        balancesHidden: s.balancesHidden,
        biometricEnabled: s.biometricEnabled,
      }),
    }
  )
)
