import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
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
export const db = getFirestore(app)
export const auth = getAuth(app)

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence unavailable: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser')
  }
})

export default app
