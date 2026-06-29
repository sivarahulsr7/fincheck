import { create } from 'zustand'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase'

const provider = new GoogleAuthProvider()

export const useAuthStore = create((set) => ({
  user: null,
  authLoading: true,
  authError: null,

  init: () => {
    getRedirectResult(auth).catch(() => {})
    // Use cached user immediately to avoid splash screen delay
    if (auth.currentUser) set({ user: auth.currentUser, authLoading: false })
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, authLoading: false })
    })
    return unsub
  },

  signInWithGoogle: async () => {
    set({ authError: null })
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider)
      } else {
        set({ authError: 'Could not sign in with Google. Please try again.' })
      }
    }
  },

  signOut: async () => {
    await fbSignOut(auth)
    set({ user: null })
  },

  clearError: () => set({ authError: null }),
}))
