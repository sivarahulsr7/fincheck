import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  writeBatch, getDoc, getDocsFromServer, increment
} from 'firebase/firestore'
import { db, FIREBASE_CONFIGURED, auth } from '../firebase'
import { DEFAULT_ACCOUNTS, CATEGORIES, ASSET_TYPES } from '../utils/constants'
import { todayISO } from '../utils/formatters'

// ─── Path scoping ─────────────────────────────────────────────────────────────
// Collections were originally top-level (flat). Per-user isolation moves them
// under users/{uid}/... . The active scope is a function of VERIFIED migration
// state: `scopedUid` is null (→ flat paths) until a confirmed migration flips
// it to the uid (→ user-scoped paths). This means a failed, empty, aborted, or
// offline migration simply keeps reading the flat data that's really there —
// never an empty screen, always retryable.
let scopedUid = null
const setScope = (uid) => { scopedUid = uid || null }

const DATA_COLLECTIONS = ['accounts', 'transactions', 'recurring', 'assets', 'liabilities', 'goals', 'budgets']

const colRef = (name) => scopedUid ? collection(db, 'users', scopedUid, name) : collection(db, name)
const docRef = (col, id) => scopedUid ? doc(db, 'users', scopedUid, col, id) : doc(db, col, id)
const newId = () => doc(colRef('_')).id

// The migration flag always lives in the user's private space, regardless of
// the current scope, so init can decide which paths to use.
const migFlagRef = (uid) => doc(db, 'users', uid, 'meta', 'migratedV2')

// Net balance change a transaction applies, as { accountId: delta }.
// Returns {} for a non-finite amount so NaN can never poison a balance.
// Exported for unit testing the balance math.
export function txDeltas(t) {
  if (!t) return {}
  const amt = Number(t.amount)
  if (!Number.isFinite(amt)) return {}
  if (t.type === 'expense') return { [t.accountId]: -amt }
  if (t.type === 'income')  return { [t.accountId]: +amt }
  if (t.type === 'transfer') {
    const d = { [t.accountId]: -amt }
    if (t.toAccountId) d[t.toAccountId] = (d[t.toAccountId] || 0) + amt
    return d
  }
  return {}
}

export const negate = (deltas) =>
  Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, -v]))

export const mergeDeltas = (a, b) => {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v
  return out
}

// ─── Local-only CRUD (used when Firebase is not configured) ───────────────────
// State is held in Zustand + persisted via zustand/persist in localStorage.

function makeLocalOps(set, get, key) {
  return {
    add: (data) => {
      const id = crypto.randomUUID()
      const item = { ...data, id, createdAt: Date.now(), updatedAt: Date.now() }
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
      dataMigrated: false, // true once data lives under users/{uid}/...
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

        // Firebase mode. First decide the data scope: if this user has a
        // verified migration flag, read from their private space; otherwise
        // read the flat collections (unchanged behavior).
        const uid = auth.currentUser?.uid
        try {
          if (uid) {
            const flag = await getDoc(migFlagRef(uid))
            setScope(flag.exists() ? uid : null)
            set({ dataMigrated: flag.exists() })
          } else {
            setScope(null)
          }
        } catch {
          setScope(null) // any error → stay on flat data (safe default)
        }

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
        const ready = Object.fromEntries(DATA_COLLECTIONS.map((c) => [c, false]))
        const checkReady = () => { if (Object.values(ready).every(Boolean)) set({ loading: false }) }

        const listen = (col, key) => {
          const unsub = onSnapshot(colRef(col), (snap) => {
            set({ [key]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
            ready[key] = true; checkReady()
          }, () => { ready[key] = true; checkReady() })
          unsubs.push(unsub)
        }

        DATA_COLLECTIONS.forEach((c) => listen(c, c))

        // Safety timeout — with IndexedDB cache, onSnapshot fires fast; 2s fallback covers slow connections
        setTimeout(() => { if (get().loading) set({ loading: false }) }, 2000)
        set({ _unsubs: unsubs })
      },

      destroy: () => {
        get()._unsubs.forEach((u) => u())
        set({ _unsubs: [], initialized: false, loading: true })
      },

      // ── Migration: flat collections → users/{uid}/... (user-triggered) ──────
      // Copies every collection into the user's private space, VERIFIES the
      // copy by counting server-side, and only then sets the migration flag.
      // The flat originals are left untouched as a backup. Returns per-collection
      // counts. Throws (leaving scope on flat) if anything fails — never sets the
      // flag on a partial/failed copy, so it stays fully retryable.
      migrateDataToPrivate: async () => {
        if (!FIREBASE_CONFIGURED) return { alreadyDone: true, counts: {} }
        const uid = auth.currentUser?.uid
        if (!uid) throw new Error('Not signed in.')
        if ((await getDoc(migFlagRef(uid))).exists()) return { alreadyDone: true, counts: {} }

        const counts = {}
        for (const col of DATA_COLLECTIONS) {
          // Force a SERVER read — a cache race returning empty is exactly the
          // failure we must not mistake for "nothing to copy".
          const flatSnap = await getDocsFromServer(collection(db, col))
          const docs = flatSnap.docs
          counts[col] = docs.length
          for (let i = 0; i < docs.length; i += 450) {
            const batch = writeBatch(db)
            for (const d of docs.slice(i, i + 450)) {
              batch.set(doc(db, 'users', uid, col, d.id), d.data())
            }
            await batch.commit()
          }
          // Read-back verification: every source doc must now exist in the
          // private copy (>= tolerates harmless leftovers from an earlier
          // partial run, so a retry can't get permanently stuck).
          const copied = await getDocsFromServer(collection(db, 'users', uid, col))
          const copiedIds = new Set(copied.docs.map((d) => d.id))
          const missing = docs.filter((d) => !copiedIds.has(d.id))
          if (missing.length > 0) {
            throw new Error(`Verification failed for ${col}: ${missing.length} of ${docs.length} not copied. No changes finalized; safe to retry.`)
          }
        }

        // Only now — every collection copied AND verified — flip the flag and
        // mark the private space seeded so init() won't re-seed defaults.
        const meta = writeBatch(db)
        meta.set(migFlagRef(uid), { at: Date.now(), counts })
        meta.set(doc(db, 'users', uid, 'meta', 'seeded'), { at: Date.now() })
        await meta.commit()

        setScope(uid)
        set({ dataMigrated: true })
        return { alreadyDone: false, counts }
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
      // Block deletion when transactions still reference the account —
      // orphaned transactions corrupt totals and cannot be balance-reversed.
      // Returns { ok:false, count } so the UI can tell the user to clear them.
      deleteAccount: async (id) => {
        const count = get().transactions.filter((t) => t.accountId === id || t.toAccountId === id).length
        if (count > 0) return { ok: false, count }
        if (!FIREBASE_CONFIGURED) await makeLocalOps(set, get, 'accounts').remove(id)
        else await deleteDoc(docRef('accounts', id))
        return { ok: true }
      },

      // ── Transactions ──────────────────────────────────────────────────────
      // Balance updates use Firestore increment() inside a writeBatch so the
      // transaction doc and every affected account move atomically (no partial
      // writes) and no stale client read is involved (no same-account edit
      // drift). Deltas for accounts that no longer exist are dropped so we
      // never resurrect a deleted account via merge.
      _commitTx: async ({ txId, txWrite, txMerge, deltas, removeTxId }) => {
        const existing = new Set(get().accounts.map((a) => a.id))
        const applied = Object.fromEntries(
          Object.entries(deltas).filter(([accId, v]) => existing.has(accId) && v !== 0)
        )

        if (!FIREBASE_CONFIGURED) {
          set((s) => ({
            transactions: removeTxId
              ? s.transactions.filter((t) => t.id !== removeTxId)
              : txMerge
                ? s.transactions.map((t) => t.id === txId ? { ...t, ...txWrite } : t)
                : [...s.transactions, txWrite],
            accounts: s.accounts.map((a) =>
              applied[a.id] != null
                ? { ...a, balance: (a.balance || 0) + applied[a.id], updatedAt: Date.now() }
                : a),
          }))
          return
        }

        const batch = writeBatch(db)
        if (removeTxId) batch.delete(docRef('transactions', removeTxId))
        else batch.set(docRef('transactions', txId), txWrite, txMerge ? { merge: true } : undefined)
        for (const [accId, delta] of Object.entries(applied)) {
          batch.set(docRef('accounts', accId), { balance: increment(delta), updatedAt: Date.now() }, { merge: true })
        }
        await batch.commit()
      },

      addTransaction: async (data) => {
        const amt = Number(data.amount)
        const id = FIREBASE_CONFIGURED ? newId() : crypto.randomUUID()
        const tx = { ...data, amount: Number.isFinite(amt) ? amt : 0, id, createdAt: Date.now(), updatedAt: Date.now() }
        await get()._commitTx({ txId: id, txWrite: tx, deltas: txDeltas(tx) })
      },

      updateTransaction: async (id, data) => {
        const old = get().transactions.find((t) => t.id === id)
        const amt = Number(data.amount)
        const safeAmt = Number.isFinite(amt) ? amt : (old?.amount || 0)
        const txWrite = { ...data, amount: safeAmt, updatedAt: Date.now() }
        const merged = { ...old, ...txWrite }
        // Net effect = reverse old, then apply new.
        const deltas = mergeDeltas(negate(txDeltas(old)), txDeltas(merged))
        await get()._commitTx({ txId: id, txWrite, txMerge: true, deltas })
      },

      deleteTransaction: async (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        if (!tx) return
        await get()._commitTx({ removeTxId: id, deltas: negate(txDeltas(tx)) })
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

      // ── Migration: Investment expenses → Assets ───────────────────────────
      // Idempotent: each asset id is derived from its source transaction id,
      // so a double-run overwrites the same asset docs instead of creating
      // duplicates. Account balances are untouched — the account was correctly
      // debited when the expense was recorded; the money is now an asset.
      convertInvestmentsToAssets: async () => {
        const { transactions } = get()
        const inv = transactions.filter((t) => t.categoryId === 'investment' && t.type === 'expense')
        if (inv.length === 0) return 0

        const assetFor = (tx) => {
          const amt = Number(tx.amount)
          const value = Number.isFinite(amt) ? amt : 0
          return {
            id: `from-tx-${tx.id}`,
            name: tx.description || 'Investment',
            assetType: 'equity',
            investedAmount: value,
            currentValue: value,
            units: null,
            purchaseDate: tx.date,
            notes: 'Converted from investment expense',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        }

        if (!FIREBASE_CONFIGURED) {
          const newAssets = inv.map(assetFor)
          const newIds = new Set(newAssets.map((a) => a.id))
          set((s) => ({
            assets: [...s.assets.filter((a) => !newIds.has(a.id)), ...newAssets],
            transactions: s.transactions.filter((t) => !(t.categoryId === 'investment' && t.type === 'expense')),
          }))
          return inv.length
        }

        const batch = writeBatch(db)
        inv.forEach((tx) => {
          const asset = assetFor(tx)
          batch.set(docRef('assets', asset.id), asset)
          batch.delete(docRef('transactions', tx.id))
        })
        await batch.commit()
        return inv.length
      },

      // ── Migration: give every asset a valid assetType ─────────────────────
      // Assets whose assetType is missing or unrecognized don't appear grouped
      // in the Allocation chart. Recover from a legacy `type` field (the old
      // import wrote `type` instead of `assetType`) when it's a known type,
      // otherwise fall back to 'other'. Idempotent.
      normalizeAssetTypes: async () => {
        const valid = new Set(ASSET_TYPES.map((t) => t.id))
        const bad = get().assets.filter((a) => !valid.has(a.assetType))
        if (bad.length === 0) return 0
        const resolve = (a) => (valid.has(a.type) ? a.type : 'other')

        if (!FIREBASE_CONFIGURED) {
          set((s) => ({
            assets: s.assets.map((a) => valid.has(a.assetType) ? a : { ...a, assetType: resolve(a), updatedAt: Date.now() }),
          }))
          return bad.length
        }

        for (let i = 0; i < bad.length; i += 450) {
          const batch = writeBatch(db)
          for (const a of bad.slice(i, i + 450)) {
            batch.set(docRef('assets', a.id), { assetType: resolve(a), updatedAt: Date.now() }, { merge: true })
          }
          await batch.commit()
        }
        return bad.length
      },

      // ── Computed ──────────────────────────────────────────────────────────
      // Net worth = all account balances + assets − liabilities. Credit-card
      // spending recorded as expenses drives that account's balance negative,
      // so summing all balances nets debt correctly under the ledger model.
      getNetWorth: () => {
        const { accounts, assets, liabilities } = get()
        const bal = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
        return accounts.reduce((s, a) => s + bal(a.balance), 0)
          + assets.reduce((s, a) => s + bal(a.currentValue || a.investedAmount || 0), 0)
          - liabilities.reduce((s, l) => s + bal(l.outstandingAmount || 0), 0)
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
