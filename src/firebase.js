import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
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

// persistentLocalCache: onSnapshot fires instantly from IndexedDB cache,
// then again when fresh data arrives — makes second+ loads feel instant
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})
export const auth = getAuth(app)

export default app
