import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'

// Global connection indicator. The app is offline-first: everything (PIN
// unlock, viewing, adding, editing) works with no network; writes queue in the
// local cache and Firestore reconciles them automatically on reconnect. This
// bar just makes that state visible.
export default function OfflineBar() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [reconnecting, setReconnecting] = useState(false)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      setReconnecting(true)
      const t = setTimeout(() => setReconnecting(false), 3000) // covers the write flush
      return () => clearTimeout(t)
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online && !reconnecting) return null

  return (
    <div
      style={{ position: 'fixed', top: 'max(env(safe-area-inset-top), 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg border
        ${online ? 'bg-green-tint border-green-dim text-green' : 'bg-card-2 border-card-border text-gray-300'}`}
    >
      {online ? (
        <><RefreshCw size={12} className="animate-spin" /> Back online — syncing…</>
      ) : (
        <><CloudOff size={12} /> Offline — saved on device, syncs later</>
      )}
    </div>
  )
}
