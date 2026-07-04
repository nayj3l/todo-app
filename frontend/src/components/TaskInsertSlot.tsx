import { useState } from 'react'

interface TaskInsertSlotProps {
  onInsert: () => void
  position?: 'top' | 'bottom'
  onHoverChange?: (active: boolean, zone: 'left' | 'right' | null) => void
}

type InsertZone = 'left' | 'right'

function SeamAddButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[#D5D5DE] bg-white text-surface-muted shadow-sm outline-none transition-all duration-200 ease-out hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-100 ${
        visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.86] opacity-0'
      }`}
      aria-label="Add task here"
      tabIndex={visible ? 0 : -1}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

export default function TaskInsertSlot({
  onInsert,
  position = 'top',
  onHoverChange,
}: TaskInsertSlotProps) {
  const [active, setActive] = useState(false)
  const [zone, setZone] = useState<InsertZone | null>(null)

  const anchorClass = position === 'top' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
  const visible = active && zone != null

  function activate(next: InsertZone) {
    setActive(true)
    setZone(next)
    onHoverChange?.(true, next)
  }

  function deactivate() {
    setActive(false)
    setZone(null)
    onHoverChange?.(false, null)
  }

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 z-10 ${position === 'top' ? 'top-0' : 'bottom-0'}`}
      >
        <div
          className={`absolute inset-x-0 ${anchorClass} h-px bg-gradient-to-r from-brand-300/0 via-brand-300/35 to-brand-300/0 transition-opacity duration-200 ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      <div
        className={`pointer-events-auto absolute -left-14 z-20 flex h-7 w-12 items-center justify-center ${anchorClass}`}
        onMouseEnter={() => activate('left')}
        onMouseLeave={deactivate}
      >
        <SeamAddButton visible={zone === 'left' && active} onClick={onInsert} />
      </div>

      <div
        className={`pointer-events-auto absolute -right-14 z-20 flex h-7 w-12 items-center justify-center ${anchorClass}`}
        onMouseEnter={() => activate('right')}
        onMouseLeave={deactivate}
      >
        <SeamAddButton visible={zone === 'right' && active} onClick={onInsert} />
      </div>
    </>
  )
}
