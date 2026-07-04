import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPriorityOption, PRIORITY_OPTIONS, type TaskPriority } from '../types/priority'

interface PriorityPickerProps {
  priority: TaskPriority
  onChange: (priority: TaskPriority) => void
}

function FlagIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {filled ? (
        <path d="M5 3v18M5 4h12l-2 3 2 3H5" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      ) : (
        <path
          d="M5 3v18M5 4h12l-2 3 2 3H5"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export default function PriorityPicker({ priority, onChange }: PriorityPickerProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const current = getPriorityOption(priority)
  const isSet = priority !== 'NONE'

  function updateMenuPosition() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    setMenuPos({
      top: rect.top + rect.height / 2,
      left: rect.left - 138,
    })
  }

  useEffect(() => {
    if (!open) {
      return
    }

    updateMenuPosition()

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    function handleReposition() {
      updateMenuPosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open])

  function handleSelect(next: TaskPriority) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isSet ? `Priority: ${current.label}` : 'Set priority'}
        onClick={(event) => {
          event.stopPropagation()
          if (open) {
            setOpen(false)
            return
          }
          updateMenuPosition()
          setOpen(true)
        }}
        className={`flex h-7 items-center gap-0.5 rounded-lg pl-1.5 pr-1 transition-colors duration-150 hover:bg-[#F3F3F6] ${
          open ? 'bg-[#F3F3F6]' : ''
        }`}
      >
        <FlagIcon color={isSet ? current.color : '#B0B0BC'} filled={isSet} />
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-[#A0A0AC] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                transform: 'translateY(-50%)',
                zIndex: 9999,
              }}
              className="min-w-[132px] rounded-2xl border border-surface-border bg-white p-1.5 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-surface-muted">
                Priority
              </p>
              <div className="flex flex-col gap-1">
                {PRIORITY_OPTIONS.map((option) => {
                  const selected = priority === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSelect(option.value)
                      }}
                      className={`flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-150 ${
                        selected ? 'bg-[#F4F4F6]' : 'hover:bg-[#FAFAFB]'
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className={selected ? 'text-surface-text' : 'text-[#55556A]'}>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
