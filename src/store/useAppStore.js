import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INACTIVITY_TIMEOUT, PIN_RESET_ATTEMPTS } from '../utils/constants'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // PIN
      pin: null,
      pinSetupDone: false,
      isLocked: false,
      lastActive: Date.now(),
      wrongAttempts: 0,

      // UI
      balancesHidden: false,
      activeTab: 'overview',
      moneySubTab: 'transactions',
      wealthSubTab: 'assets',

      // Actions
      setPin: (pin) => set({ pin, pinSetupDone: true, isLocked: false }),
      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false, wrongAttempts: 0, lastActive: Date.now() }),
      resetWrongAttempts: () => set({ wrongAttempts: 0 }),
      wrongPin: () => {
        const { wrongAttempts } = get()
        const next = wrongAttempts + 1
        if (next >= PIN_RESET_ATTEMPTS) {
          set({ pin: null, pinSetupDone: false, isLocked: false, wrongAttempts: 0 })
        } else {
          set({ wrongAttempts: next })
        }
      },

      checkInactivity: () => {
        const { lastActive, isLocked, pinSetupDone } = get()
        if (!pinSetupDone || isLocked) return
        if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
          set({ isLocked: true })
        }
      },
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
      }),
    }
  )
)
