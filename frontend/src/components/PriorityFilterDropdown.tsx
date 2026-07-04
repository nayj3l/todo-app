import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PriorityFilterValue } from '../hooks/useTaskFilters'
import { getPriorityOption, PRIORITY_OPTIONS } from '../types/priority'

interface PriorityFilterDropdownProps {
  value: PriorityFilterValue
  onChange: (value: PriorityFilterValue) => void
}

function getFilterLabel(value: PriorityFilterValue) {
  if (value === 'ALL') {
    return 'All priorities'
  }
  return getPriorityOption(value).label
}

export default function PriorityFilterDropdown({ value, onChange }: PriorityFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isFiltered = value !== 'ALL'
  const currentColor = isFiltered ? getPriorityOption(value).color : undefined

  function updateMenuPosition() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.right,
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

  function handleSelect(next: PriorityFilterValue) {
    onChange(next)
    setOpen(false)
  }

  return (
    <>
      <div
        className={`flex h-full shrink-0 items-center rounded-r-2xl transition-colors ${
          open || isFiltered ? 'bg-[#FAFAFB]' : 'hover:bg-[#FAFAFB]/60'
        }`}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Priority filter: ${getFilterLabel(value)}`}
          onClick={() => {
            if (open) {
              setOpen(false)
              return
            }
            updateMenuPosition()
            setOpen(true)
          }}
          className={`flex h-full items-center gap-2 px-4 text-xs font-medium transition outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-100 ${
            open || isFiltered ? 'text-surface-text' : 'text-surface-muted'
          }`}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: currentColor ?? '#D5D5DE',
              opacity: isFiltered ? 1 : 0.55,
            }}
            aria-hidden="true"
          />
          <span className="max-w-[6.5rem] truncate">{getFilterLabel(value)}</span>
          <svg
            width="12"
            height="12"
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
      </div>

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label="Priority filter"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                transform: 'translateX(-100%)',
                zIndex: 9999,
              }}
              className="min-w-[168px] overflow-hidden rounded-2xl border border-surface-border bg-white p-1.5 shadow-lg"
            >
              <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-surface-muted">
                Priority
              </p>
              <button
                type="button"
                role="option"
                aria-selected={value === 'ALL'}
                onClick={() => handleSelect('ALL')}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${
                  value === 'ALL' ? 'bg-brand-50 text-brand-600' : 'text-[#55556A] hover:bg-[#FAFAFB]'
                }`}
              >
                <span className="flex h-2 w-2 shrink-0 items-center justify-center">
                  {value === 'ALL' && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </span>
                All priorities
              </button>
              <div className="my-1 h-px bg-surface-border" />
              {PRIORITY_OPTIONS.map((option) => {
                const selected = value === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${
                      selected ? 'bg-[#F4F4F6] text-surface-text' : 'text-[#55556A] hover:bg-[#FAFAFB]'
                    }`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                    {option.label}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
