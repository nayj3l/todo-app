import { useEffect, useRef, useState } from 'react'
import type { TaskGroup } from '../types/board'
import type { GroupTaskSummary } from '../utils/groupStats'
import AddCardButton from './AddCardButton'

interface GroupHeaderProps {
  group: TaskGroup
  summary: GroupTaskSummary
  filtersActive: boolean
  onRename: (groupId: number, name: string) => Promise<void>
  onAddTask: (groupId: number) => void
}

export default function GroupHeader({
  group,
  summary,
  filtersActive,
  onRename,
  onAddTask,
}: GroupHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(group.name)
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

  return (
    <div className="mb-2 px-1">
      <div className="group/header flex min-h-[28px] items-center gap-2 rounded-xl py-0.5 transition hover:bg-[#FAFAFB]">
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
            title="Click to rename project"
          >
            {group.name}
          </button>
        )}
        <AddCardButton
          onClick={() => onAddTask(group.id)}
          className="shrink-0 opacity-0 transition group-hover/header:opacity-100"
        />
      </div>

      <div className="mt-1 flex items-center gap-2.5 pl-[18px] pr-1">
        {summary.total === 0 ? (
          <p className="text-[11px] text-surface-muted/80">No tasks yet</p>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-[11px] leading-none text-surface-muted/80">
              <span className="tabular-nums">{summary.total}</span> task{summary.total === 1 ? '' : 's'}
              <span className="mx-1 text-[#E4E4EA]">·</span>
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
            <div
              className="h-0.5 w-14 shrink-0 overflow-hidden rounded-full bg-[#EBEBF0]/70"
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
          </>
        )}
      </div>
    </div>
  )
}
