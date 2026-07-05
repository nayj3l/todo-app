import { useEffect, useRef, useState } from 'react'
import type { TaskGroup } from '../types/board'
import type { GroupTaskSummary } from '../utils/groupStats'
import type { GroupDragHandleProps } from './SortableGroupSection'
import ProjectContextMenu from './ProjectContextMenu'

interface GroupHeaderProps {
  group: TaskGroup
  summary: GroupTaskSummary
  filtersActive: boolean
  showTaskBreakdown: boolean
  showProgressBar: boolean
  onRename: (groupId: number, name: string) => Promise<void>
  onDelete?: (group: TaskGroup) => void
  dragHandle?: GroupDragHandleProps
}

export default function GroupHeader({
  group,
  summary,
  filtersActive,
  showTaskBreakdown,
  showProgressBar,
  onRename,
  onDelete,
  dragHandle,
}: GroupHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(group.name)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(group.name)
  }, [group.name])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function commitRename() {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === group.name) {
      setDraft(group.name)
      return
    }
    await onRename(group.id, next)
  }

  const taskCountLabel =
    filtersActive && summary.visible !== summary.total
      ? `${summary.visible} / ${summary.total}`
      : `${summary.total} task${summary.total === 1 ? '' : 's'}`

  const showOptionalRow = summary.total > 0 && (showTaskBreakdown || showProgressBar)

  return (
    <div className="mb-3">
      <div
        className="group/header flex items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-[#FAFAFB]"
        onContextMenu={(event) => {
          if (editing || !onDelete) {
            return
          }
          event.preventDefault()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitRename()
              }
              if (event.key === 'Escape') {
                setDraft(group.name)
                setEditing(false)
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-brand-500 bg-white px-2 py-1 text-base font-semibold text-surface-text outline-none ring-2 ring-brand-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left text-base font-semibold text-surface-text transition hover:text-brand-600"
            title="Click to rename board"
          >
            {group.name}
          </button>
        )}
        {!editing && (
          <span
            className="shrink-0 rounded-full bg-[#F3F3F6] px-3 py-1 text-[11px] font-medium tabular-nums text-[#9A9AA8]"
            title={taskCountLabel}
          >
            {taskCountLabel}
          </span>
        )}
        {dragHandle && !editing && (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-surface-muted transition hover:bg-[#F3F3F6] hover:text-surface-text active:cursor-grabbing"
            aria-label={`Drag to reorder ${group.name}`}
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="7" r="1.5" />
              <circle cx="15" cy="7" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="17" r="1.5" />
              <circle cx="15" cy="17" r="1.5" />
            </svg>
          </button>
        )}
      </div>

      {showOptionalRow && (
        <div className="mt-2 flex items-center gap-2.5 px-4">
          {showTaskBreakdown && (
            <p className="min-w-0 flex-1 text-[11px] leading-none text-surface-muted/80">
              <span className="tabular-nums">{summary.open}</span> open
              <span className="mx-1 text-[#E4E4EA]">·</span>
              <span className="tabular-nums">{summary.done}</span> done
              {filtersActive && summary.visible !== summary.total && (
                <>
                  <span className="mx-1 text-[#E4E4EA]">·</span>
                  <span className="tabular-nums">{summary.visible}</span> shown
                </>
              )}
            </p>
          )}
          {showProgressBar && (
            <div
              className={`h-0.5 shrink-0 overflow-hidden rounded-full bg-[#EBEBF0]/70 ${
                showTaskBreakdown ? 'w-14' : 'w-full max-w-[140px]'
              }`}
              role="progressbar"
              aria-valuenow={summary.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${summary.progress}% of tasks complete`}
              title={`${summary.progress}% complete`}
            >
              <div
                className="h-full rounded-full opacity-40"
                style={{ width: `${summary.progress}%`, backgroundColor: group.color }}
              />
            </div>
          )}
          {showProgressBar && !showTaskBreakdown && (
            <span className="shrink-0 text-[11px] tabular-nums text-surface-muted/70">{summary.progress}%</span>
          )}
        </div>
      )}
      {menu && onDelete && (
        <ProjectContextMenu
          x={menu.x}
          y={menu.y}
          onRename={() => setEditing(true)}
          onDelete={() => onDelete(group)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
