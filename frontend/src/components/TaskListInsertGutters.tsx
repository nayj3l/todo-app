import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type SeamEdge = 'top' | 'bottom'
type InsertZone = 'left' | 'right'

export interface SeamHoverState {
  insertIndex: number
  edge: SeamEdge
}

interface TaskListInsertGuttersProps {
  children: ReactNode
  onInsert: (insertIndex: number) => void
  onSeamHoverChange: (hover: SeamHoverState | null) => void
  disabled?: boolean
  layoutRevision?: unknown
}

interface SnappedSeam {
  insertIndex: number
  edge: SeamEdge
  top: number
}

const LEAVE_DELAY_MS = 140
const SNAP_TRANSITION = 'top 160ms cubic-bezier(0.34, 1.15, 0.64, 1)'

function SeamAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[#D5D5DE] bg-white text-surface-muted shadow-sm outline-none transition-colors duration-150 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-100"
      aria-label="Add task here"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

function findNearestSeam(container: HTMLElement, clientY: number): SnappedSeam | null {
  const containerRect = container.getBoundingClientRect()
  const markers = container.querySelectorAll<HTMLElement>('[data-seam-insert]')

  let nearest: SnappedSeam | null = null
  let minDistance = Infinity

  markers.forEach((marker) => {
    const rect = marker.getBoundingClientRect()
    const seamY = rect.top
    const distance = Math.abs(clientY - seamY)

    if (distance < minDistance) {
      minDistance = distance
      nearest = {
        insertIndex: Number(marker.dataset.seamInsert),
        edge: marker.dataset.seamEdge as SeamEdge,
        top: seamY - containerRect.top,
      }
    }
  })

  return nearest
}

export default function TaskListInsertGutters({
  children,
  onInsert,
  onSeamHoverChange,
  disabled = false,
  layoutRevision,
}: TaskListInsertGuttersProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [snap, setSnap] = useState<(SnappedSeam & { zone: InsertZone }) | null>(null)
  const [visible, setVisible] = useState(false)

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current != null) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearLeaveTimer()
    leaveTimerRef.current = setTimeout(() => {
      setVisible(false)
      setSnap(null)
      onSeamHoverChange(null)
    }, LEAVE_DELAY_MS)
  }, [clearLeaveTimer, onSeamHoverChange])

  const activateZone = useCallback(
    (zone: InsertZone, clientY: number) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      const nearest = findNearestSeam(container, clientY)
      clearLeaveTimer()

      if (!nearest) {
        scheduleHide()
        return
      }

      setVisible(true)
      setSnap({ ...nearest, zone })
      onSeamHoverChange({ insertIndex: nearest.insertIndex, edge: nearest.edge })
    },
    [clearLeaveTimer, onSeamHoverChange, scheduleHide],
  )

  useEffect(() => {
    return () => clearLeaveTimer()
  }, [clearLeaveTimer])

  useEffect(() => {
    if (disabled) {
      clearLeaveTimer()
      setVisible(false)
      setSnap(null)
      onSeamHoverChange(null)
    }
  }, [clearLeaveTimer, disabled, onSeamHoverChange])

  useLayoutEffect(() => {
    if (!visible || !snap || !containerRef.current) {
      return
    }
    const marker = containerRef.current.querySelector<HTMLElement>(
      `[data-seam-insert="${snap.insertIndex}"][data-seam-edge="${snap.edge}"]`,
    )
    if (!marker) {
      return
    }
    const containerRect = containerRef.current.getBoundingClientRect()
    const top = marker.getBoundingClientRect().top - containerRect.top
    setSnap((current) => (current ? { ...current, top } : null))
  }, [layoutRevision, snap?.edge, snap?.insertIndex, visible])

  const showLeft = visible && snap?.zone === 'left'
  const showRight = visible && snap?.zone === 'right'

  return (
    <div ref={containerRef} className="relative">
      {!disabled && (
        <>
          <div
            className="absolute bottom-0 left-0 top-0 z-20 w-14"
            onMouseMove={(event) => activateZone('left', event.clientY)}
            onMouseLeave={scheduleHide}
          />
          <div
            className="absolute bottom-0 right-0 top-0 z-20 w-14"
            onMouseMove={(event) => activateZone('right', event.clientY)}
            onMouseLeave={scheduleHide}
          />

          <div
            className={`pointer-events-none absolute inset-x-0 z-10 h-px bg-gradient-to-r from-brand-300/0 via-brand-300/35 to-brand-300/0 transition-opacity duration-200 ease-out ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              top: snap?.top ?? 0,
              transform: 'translateY(-50%)',
              transition: visible ? `${SNAP_TRANSITION}, opacity 200ms ease-out` : 'opacity 200ms ease-out',
            }}
          />

          <div
            className={`absolute left-0 z-30 flex w-14 -translate-y-1/2 justify-center transition-opacity duration-150 ${
              showLeft ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              top: snap?.top ?? 0,
              transition: `${SNAP_TRANSITION}, opacity 150ms ease-out`,
            }}
          >
            {showLeft && snap && (
              <div key={`${snap.insertIndex}-${snap.edge}`} className="snap-add-enter">
                <SeamAddButton onClick={() => onInsert(snap.insertIndex)} />
              </div>
            )}
          </div>

          <div
            className={`absolute right-0 z-30 flex w-14 -translate-y-1/2 justify-center transition-opacity duration-150 ${
              showRight ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              top: snap?.top ?? 0,
              transition: `${SNAP_TRANSITION}, opacity 150ms ease-out`,
            }}
          >
            {showRight && snap && (
              <div key={`${snap.insertIndex}-${snap.edge}`} className="snap-add-enter">
                <SeamAddButton onClick={() => onInsert(snap.insertIndex)} />
              </div>
            )}
          </div>
        </>
      )}

      {children}
    </div>
  )
}
