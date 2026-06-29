import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="bottom-sheet-overlay fade-in" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="bottom-sheet-body">
          {children}
        </div>
      </div>
    </div>
  )
}
