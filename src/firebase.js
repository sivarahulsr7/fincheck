import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCLiLNyXOGTCCCrznSiWFzXDezMBMs1L18',
  authDomain: 'fincheck-sr7.firebaseapp.com',
  projectId: 'fincheck-sr7',
  storageBucket: 'fincheck-sr7.firebasestorage.app',
  messagingSenderId: '194485864674',
  appId: '1:194485864674:web:44b8c53c8fac7938f1f6bb',
}

export const FIREBASE_CONFIGURED = true

const app = initializeApp(firebaseConfig)

// Offline-first: persistentLocalCache keeps a full IndexedDB copy, so reads and
// writes work fully offline and queue for automatic reconciliation when the
// connection returns. Multi-tab manager keeps several open tabs consistent.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
// Auth persists to IndexedDB by default, so the signed-in session (and thus the
// PIN-gated app) restores offline without a network round-trip.
export const auth = getAuth(app)

export default app
