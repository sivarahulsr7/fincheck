import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef()
  const dragStart = useRef(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Swipe down to close
  const onTouchStart = (e) => { dragStart.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    if (dragStart.current == null) return
    const delta = e.changedTouches[0].clientY - dragStart.current
    if (delta > 80) onClose()
    dragStart.current = null
  }

  if (!open) return null

  return (
    <div className="bottom-sheet-overlay fade-in" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-base font-semibold text-white">{title || ''}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-card-2 flex items-center justify-center text-gray-400 active:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="bottom-sheet-body">
          {children}
        </div>
      </div>
    </div>
  )
}
