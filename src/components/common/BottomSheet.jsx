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

  // Swipe down to close — but only when the gesture starts at the top of the
  // sheet (not mid-scroll in a long form) and not on a form control, so a
  // normal scroll or field drag never dismisses the sheet.
  const onTouchStart = (e) => {
    const onControl = e.target.closest('input, textarea, select, button')
    const body = e.target.closest('.bottom-sheet-body')
    const bodyScrolled = body && body.scrollTop > 0
    dragStart.current = (onControl || bodyScrolled) ? null : e.touches[0].clientY
  }
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
            aria-label="Close"
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
