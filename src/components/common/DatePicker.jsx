import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { toISO, parseLocal } from '../../utils/formatters'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function fmtDisplay(str) {
  if (!str) return 'Select date'
  const d = parseLocal(str)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// `max` (YYYY-MM-DD) optionally caps selectable dates — pass todayISO() to
// forbid future dates.
export default function DatePicker({ value, onChange, max }) {
  const [open, setOpen] = useState(false)

  const init = parseLocal(value)
  const [view, setView] = useState({ year: init.getFullYear(), month: init.getMonth() })

  const prevMonth = () =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const nextMonth = () =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })

  const firstDow = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const todayISO = toISO(new Date())

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Month is fully in the future (relative to max) → block forward nav
  const viewAfterMax = max && `${view.year}-${String(view.month + 1).padStart(2, '0')}` > max.slice(0, 7)

  const handleSelect = (day) => {
    const iso = toISO(new Date(view.year, view.month, day))
    if (max && iso > max) return
    onChange(iso)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setView({ year: parseLocal(value).getFullYear(), month: parseLocal(value).getMonth() }); setOpen(true) }}
        className="w-full bg-card-2 border border-card-border rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between text-white outline-none">
        <span>{fmtDisplay(value)}</span>
        <Calendar size={16} className="text-gray-500 flex-shrink-0" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Select Date">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onPointerDown={prevMonth}
            className="w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center text-gray-400 active:text-white">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-semibold text-sm">
            {MONTHS[view.month]} {view.year}
          </span>
          <button onPointerDown={viewAfterMax ? undefined : nextMonth} disabled={viewAfterMax}
            className={`w-9 h-9 rounded-xl bg-card-2 flex items-center justify-center active:text-white ${viewAfterMax ? 'text-gray-700' : 'text-gray-400'}`}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[11px] text-gray-500 font-semibold py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-2">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const iso = toISO(new Date(view.year, view.month, day))
            const isSelected = iso === value
            const isToday = iso === todayISO
            const disabled = max && iso > max
            return (
              <button key={i} onPointerDown={disabled ? undefined : () => handleSelect(day)} disabled={disabled}
                className={`h-9 w-full rounded-xl text-sm font-medium transition-all
                  ${disabled
                    ? 'text-gray-700'
                    : isSelected
                      ? 'bg-green text-[#1a3d29] font-bold'
                      : isToday
                        ? 'border border-green/60 text-green'
                        : 'text-white active:bg-card-2'
                  }`}>
                {day}
              </button>
            )
          })}
        </div>

        {/* Quick shortcuts */}
        <div className="flex gap-2 pt-3 border-t border-card-border">
          {[
            { label: 'Today', iso: toISO(new Date()) },
            { label: 'Yesterday', iso: toISO(new Date(Date.now() - 86400000)) },
          ].map(({ label, iso }) => (
            <button key={label} onPointerDown={() => { onChange(iso); setOpen(false) }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                ${value === iso ? 'bg-green text-[#1a3d29] border-green' : 'border-card-border text-gray-400 bg-card-2'}`}>
              {label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
