import { useEffect, useRef, useState } from 'react'
import type { TaskGroup } from '../types/board'
import AddCardButton from './AddCardButton'

interface GroupHeaderProps {
  group: TaskGroup
  onRename: (groupId: number, name: string) => Promise<void>
  onAddTask: (groupId: number) => void
}

export default function GroupHeader({ group, onRename, onAddTask }: GroupHeaderProps) {
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
    <div className="group/header mb-2 flex min-h-[28px] items-center gap-2 rounded-xl px-1 py-0.5 transition hover:bg-[#FAFAFB]">
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
  )
}
