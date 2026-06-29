import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  writeBatch, getDoc
} from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED } from '../firebase'
import { DEFAULT_ACCOUNTS, CATEGORIES } from '../utils/constants'
import { todayISO, monthKey } from '../utils/formatters'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const colRef = (name) => collection(db, name)
const docRef = (col, id) => doc(db, col, id)
const newId = () => doc(colRef('_')).id

// ─── Local-only CRUD (used when Firebase is not configured) ───────────────────
// State is held in Zustand + persisted via zustand/persist in localStorage.

function makeLocalOps(set, get, key) {
  return {
    add: (data) => {
      const id = crypto.randomUUID()
      const item = { ...data, id, createdAt: todayISO(), updatedAt: Date.now() }
      set((s) => ({ [key]: [...s[key], item] }))
      return Promise.resolve(item)
    },
    update: (id, data) => {
      set((s) => ({ [key]: s[key].map((i) => i.id === id ? { ...i, ...data, updatedAt: Date.now() } : i) }))
      return Promise.resolve()
    },
    remove: (id) => {
      set((s) => ({ [key]: s[key].filter((i) => i.id !== id) }))
      return Promise.resolve()
    },
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useFinanceStore = create(
  persist(
    (set, get) => ({
      accounts: [],
      transactions: [],
      recurring: [],
      assets: [],
      liabilities: [],
      goals: [],
      budgets: [],
      categories: CATEGORIES,
      loading: true,
      initialized: false,
      _unsubs: [],

      // ── Init ──────────────────────────────────────────────────────────────
      init: async () => {
        if (get().initialized) return
        set({ initialized: true })

        if (!FIREBASE_CONFIGURED) {
          // Local mode: seed default accounts if none exist
          if (get().accounts.length === 0) {
            set({ accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a, createdAt: todayISO(), updatedAt: Date.now() })) })
          }
          set({ loading: false })
          return
        }

        // Firebase mode
        try {
          const seeded = await getDoc(docRef('meta', 'seeded'))
          if (!seeded.exists()) {
            const batch = writeBatch(db)
            DEFAULT_ACCOUNTS.forEach((acc) => {
              batch.set(docRef('accounts', acc.id), { ...acc, createdAt: todayISO(), updatedAt: Date.now() })
            })
            batch.set(docRef('meta', 'seeded'), { at: Date.now() })
            await batch.commit()
          }
        } catch (e) {
          console.warn('Firebase seed failed, using local mode', e)
          if (get().accounts.length === 0) set({ accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a, createdAt: todayISO(), updatedAt: Date.now() })) })
          set({ loading: false })
          return
        }

        const unsubs = []
        const ready = { accounts: false, transactions: false, recurring: false, assets: false, liabilities: false, goals: false, budgets: false }
        const checkReady = () => { if (Object.values(ready).every(Boolean)) set({ loading: false }) }

        const listen = (col, key) => {
          const unsub = onSnapshot(colRef(col), (snap) => {
            set({ [key]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
            ready[key] = true; checkReady()
          }, () => { ready[key] = true; checkReady() })
          unsubs.push(unsub)
        }

        ;['accounts', 'transactions', 'recurring', 'assets', 'liabilities', 'goals', 'budgets'].forEach((c) => listen(c, c))

        // Safety timeout
        setTimeout(() => { if (get().loading) set({ loading: false }) }, 5000)
        set({ _unsubs: unsubs })
      },

      destroy: () => {
        get()._unsubs.forEach((u) => u())
        set({ _unsubs: [], initialized: false })
      },

      // ── Accounts ──────────────────────────────────────────────────────────
      addAccount: (data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'accounts').add(data)
        const id = newId()
        return setDoc(docRef('accounts', id), { ...data, id, createdAt: todayISO(), updatedAt: Date.now() })
      },
      updateAccount: (id, data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'accounts').update(id, data)
        return setDoc(docRef('accounts', id), { ...data, id, updatedAt: Date.now() }, { merge: true })
      },
      deleteAccount: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'accounts').remove(id)
        return deleteDoc(docRef('accounts', id))
      },

      // ── Transactions ──────────────────────────────────────────────────────
      addTransaction: async (data) => {
        const { accounts } = get()
        const id = FIREBASE_CONFIGURED ? newId() : crypto.randomUUID()
        const tx = { ...data, id, createdAt: todayISO(), updatedAt: Date.now() }

        if (!FIREBASE_CONFIGURED) {
          set((s) => ({ transactions: [...s.transactions, tx] }))
        } else {
          await setDoc(docRef('transactions', id), tx)
        }

        // Update balances
        const updateBal = async (accId, delta) => {
          const acc = accounts.find((a) => a.id === accId)
          if (!acc) return
          const newBal = (acc.balance || 0) + delta
          if (!FIREBASE_CONFIGURED) {
            set((s) => ({ accounts: s.accounts.map((a) => a.id === accId ? { ...a, balance: newBal, updatedAt: Date.now() } : a) }))
          } else {
            await setDoc(docRef('accounts', accId), { balance: newBal, updatedAt: Date.now() }, { merge: true })
          }
        }

        if (data.type === 'expense') await updateBal(data.accountId, -Number(data.amount))
        else if (data.type === 'income') await updateBal(data.accountId, +Number(data.amount))
        else if (data.type === 'transfer') {
          await updateBal(data.accountId, -Number(data.amount))
          await updateBal(data.toAccountId, +Number(data.amount))
        }
      },

      updateTransaction: async (id, data) => {
        if (!FIREBASE_CONFIGURED) {
          set((s) => ({ transactions: s.transactions.map((t) => t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t) }))
          return
        }
        await setDoc(docRef('transactions', id), { ...data, updatedAt: Date.now() }, { merge: true })
      },

      deleteTransaction: async (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        if (!tx) return

        if (!FIREBASE_CONFIGURED) {
          set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
        } else {
          await deleteDoc(docRef('transactions', id))
        }

        // Reverse balance
        const { accounts } = get()
        const reverseBal = async (accId, delta) => {
          const acc = accounts.find((a) => a.id === accId)
          if (!acc) return
          const newBal = (acc.balance || 0) + delta
          if (!FIREBASE_CONFIGURED) {
            set((s) => ({ accounts: s.accounts.map((a) => a.id === accId ? { ...a, balance: newBal } : a) }))
          } else {
            await setDoc(docRef('accounts', accId), { balance: newBal, updatedAt: Date.now() }, { merge: true })
          }
        }

        if (tx.type === 'expense') await reverseBal(tx.accountId, +Number(tx.amount))
        else if (tx.type === 'income') await reverseBal(tx.accountId, -Number(tx.amount))
        else if (tx.type === 'transfer') {
          await reverseBal(tx.accountId, +Number(tx.amount))
          await reverseBal(tx.toAccountId, -Number(tx.amount))
        }
      },

      // ── Recurring ─────────────────────────────────────────────────────────
      addRecurring: (data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'recurring').add({ ...data, isActive: true })
        const id = newId()
        return setDoc(docRef('recurring', id), { ...data, id, isActive: true, createdAt: todayISO(), updatedAt: Date.now() })
      },
      updateRecurring: (id, data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'recurring').update(id, data)
        return setDoc(docRef('recurring', id), { ...data, updatedAt: Date.now() }, { merge: true })
      },
      deleteRecurring: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'recurring').remove(id)
        return deleteDoc(docRef('recurring', id))
      },

      // ── Assets ────────────────────────────────────────────────────────────
      addAsset: (data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'assets').add(data)
        const id = newId()
        return setDoc(docRef('assets', id), { ...data, id, createdAt: todayISO(), updatedAt: Date.now() })
      },
      updateAsset: (id, data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'assets').update(id, data)
        return setDoc(docRef('assets', id), { ...data, updatedAt: Date.now() }, { merge: true })
      },
      deleteAsset: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'assets').remove(id)
        return deleteDoc(docRef('assets', id))
      },

      // ── Liabilities ───────────────────────────────────────────────────────
      addLiability: (data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'liabilities').add(data)
        const id = newId()
        return setDoc(docRef('liabilities', id), { ...data, id, createdAt: todayISO(), updatedAt: Date.now() })
      },
      updateLiability: (id, data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'liabilities').update(id, data)
        return setDoc(docRef('liabilities', id), { ...data, updatedAt: Date.now() }, { merge: true })
      },
      deleteLiability: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'liabilities').remove(id)
        return deleteDoc(docRef('liabilities', id))
      },

      // ── Goals ─────────────────────────────────────────────────────────────
      addGoal: (data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'goals').add({ ...data, currentAmount: 0 })
        const id = newId()
        return setDoc(docRef('goals', id), { ...data, id, currentAmount: 0, createdAt: todayISO(), updatedAt: Date.now() })
      },
      updateGoal: (id, data) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'goals').update(id, data)
        return setDoc(docRef('goals', id), { ...data, updatedAt: Date.now() }, { merge: true })
      },
      deleteGoal: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'goals').remove(id)
        return deleteDoc(docRef('goals', id))
      },

      // ── Budgets ───────────────────────────────────────────────────────────
      setBudget: (data) => {
        if (!FIREBASE_CONFIGURED) {
          const id = data.id || crypto.randomUUID()
          const item = { ...data, id, spent: data.spent || 0, updatedAt: Date.now() }
          set((s) => {
            const existing = s.budgets.findIndex((b) => b.id === id)
            const budgets = existing >= 0
              ? s.budgets.map((b) => b.id === id ? item : b)
              : [...s.budgets, item]
            return { budgets }
          })
          return Promise.resolve()
        }
        const id = data.id || newId()
        return setDoc(docRef('budgets', id), { ...data, id, spent: data.spent || 0, updatedAt: Date.now() }, { merge: true })
      },
      deleteBudget: (id) => {
        if (!FIREBASE_CONFIGURED) return makeLocalOps(set, get, 'budgets').remove(id)
        return deleteDoc(docRef('budgets', id))
      },

      // ── Computed ──────────────────────────────────────────────────────────
      getNetWorth: () => {
        const { accounts, assets, liabilities } = get()
        return accounts.reduce((s, a) => s + (a.balance || 0), 0)
          + assets.reduce((s, a) => s + (a.currentValue || a.investedAmount || 0), 0)
          - liabilities.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
      },

      getCashflow: (days = 30) => {
        const { transactions } = get()
        const since = new Date(); since.setDate(since.getDate() - days)
        const sinceStr = since.toISOString().split('T')[0]
        const filtered = transactions.filter((t) => t.date >= sinceStr)
        return {
          income:  filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
          expense: filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
        }
      },
    }),
    {
      name: 'fincheck-finance',
      // Only persist local state (Firebase data comes from listeners)
      partialize: (s) => ({
        accounts:     FIREBASE_CONFIGURED ? [] : s.accounts,
        transactions: FIREBASE_CONFIGURED ? [] : s.transactions,
        recurring:    FIREBASE_CONFIGURED ? [] : s.recurring,
        assets:       FIREBASE_CONFIGURED ? [] : s.assets,
        liabilities:  FIREBASE_CONFIGURED ? [] : s.liabilities,
        goals:        FIREBASE_CONFIGURED ? [] : s.goals,
        budgets:      FIREBASE_CONFIGURED ? [] : s.budgets,
      }),
    }
  )
)
