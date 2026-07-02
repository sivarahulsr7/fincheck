import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PIN_RESET_ATTEMPTS } from '../utils/constants'
import { cryptoAvailable, genSalt, hashPin } from '../utils/pinCrypto'

export const useAppStore = create(
  persist(
    (set, get) => ({
      pin: null,          // legacy plaintext (pre-hashing); upgraded on init
      pinHash: null,      // PBKDF2 hash of the PIN
      pinSalt: null,      // per-install salt for the hash
      pinSetupDone: false,
      isLocked: true,
      lastActive: Date.now(),
      wrongAttempts: 0,
      biometricEnabled: false,

      balancesHidden: true,
      showLiabilities: true, // show the liabilities figure in Overview's net-worth section
      activeTab: 'overview',
      moneySubTab: 'transactions',
      wealthSubTab: 'assets',
      presets: [], // quick-add transaction templates (TXN-5)
      netWorthGoal: null, // { target: number, date: 'YYYY-MM-DD' } (NW-2)

      // Store a salted hash, never the raw PIN (falls back to plaintext only
      // when crypto.subtle is unavailable, e.g. a non-secure context).
      setPin: async (pin) => {
        if (cryptoAvailable()) {
          const salt = genSalt()
          const hash = await hashPin(pin, salt)
          set({ pinHash: hash, pinSalt: salt, pin: null, pinSetupDone: true, isLocked: false, wrongAttempts: 0 })
        } else {
          set({ pin, pinHash: null, pinSalt: null, pinSetupDone: true, isLocked: false, wrongAttempts: 0 })
        }
      },

      // Async: compares against the hash, or the legacy plaintext if no hash.
      verifyPin: async (input) => {
        const { pinHash, pinSalt, pin } = get()
        if (pinHash && pinSalt) {
          try { return (await hashPin(input, pinSalt)) === pinHash } catch { return false }
        }
        return pin != null && input === pin
      },

      // Eagerly migrate a legacy plaintext PIN to a hash on app start. Runs for
      // biometric users too (they never call verifyPin). Never clears the
      // plaintext until the hash is computed AND persisted — a hashPin throw
      // leaves the plaintext intact so the user is never locked out.
      upgradeLegacyPin: async () => {
        const { pin, pinHash } = get()
        if (pinHash || pin == null || !cryptoAvailable()) return
        try {
          const salt = genSalt()
          const hash = await hashPin(pin, salt)
          set({ pinHash: hash, pinSalt: salt, pin: null }) // single atomic persist
        } catch { /* keep plaintext — do not lock the user out */ }
      },

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
          set({ pin: null, pinHash: null, pinSalt: null, pinSetupDone: false, isLocked: true, wrongAttempts: 0, biometricEnabled: false })
          localStorage.removeItem('fincheck-biometric-id')
          return true
        }
        set({ wrongAttempts: next })
        return false
      },

      setBiometricEnabled: (val) => set({ biometricEnabled: val }),

      touchActivity: () => set({ lastActive: Date.now() }),
      toggleBalances: () => set((s) => ({ balancesHidden: !s.balancesHidden })),
      toggleShowLiabilities: () => set((s) => ({ showLiabilities: !s.showLiabilities })),
      addPreset: (p) => set((s) => ({ presets: [...s.presets, { ...p, id: crypto.randomUUID() }] })),
      removePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      setNetWorthGoal: (goal) => set({ netWorthGoal: goal }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMoneySubTab: (tab) => set({ moneySubTab: tab }),
      setWealthSubTab: (tab) => set({ wealthSubTab: tab }),
    }),
    {
      name: 'fincheck-app',
      partialize: (s) => ({
        pin: s.pin,           // legacy; null once upgraded to a hash
        pinHash: s.pinHash,
        pinSalt: s.pinSalt,
        pinSetupDone: s.pinSetupDone,
        balancesHidden: s.balancesHidden,
        showLiabilities: s.showLiabilities,
        biometricEnabled: s.biometricEnabled,
        presets: s.presets,
        netWorthGoal: s.netWorthGoal,
      }),
    }
  )
)
