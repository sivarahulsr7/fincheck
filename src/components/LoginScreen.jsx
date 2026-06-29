import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export default function LoginScreen() {
  const { signInWithGoogle, authError } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    await signInWithGoogle()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-[#111] flex flex-col items-center justify-center px-6"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-12 gap-3">
        <div className="w-20 h-20 rounded-2xl bg-green flex items-center justify-center shadow-lg">
          <span className="text-[#1a3d29] font-bold text-3xl tracking-tight">FC</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Fin Check</h1>
        <p className="text-gray-400 text-sm text-center">Your personal finance manager</p>
      </div>

      {/* Sign in */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 rounded-xl text-sm disabled:opacity-50 shadow"
        >
          {loading ? (
            <span className="text-gray-600">Signing in...</span>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {authError && (
          <p className="text-red text-xs text-center">{authError}</p>
        )}
      </div>

      <p className="mt-10 text-gray-600 text-xs text-center">
        Your data is private and only accessible to you.
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
