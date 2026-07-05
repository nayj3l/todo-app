import { useState } from 'react'
import type { Task, TaskGroup } from '../types/board'
import { RECYCLE_BIN_LIMIT } from '../constants/recycleBin'
import ConfirmDialog from './ConfirmDialog'

interface RecycleBinProps {
  tasks: Task[]
  groups: TaskGroup[]
  onRestore: (task: Task) => Promise<void>
  onClearAll: () => Promise<void>
}

function formatDeletedTime(value: string | null | undefined) {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ClearAllButton({ count, onConfirm }: { count: number; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Clear all
      </button>
      <ConfirmDialog
        open={open}
        title="Clear recycle bin?"
        description={`Permanently remove all ${count} deleted task${count === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Clear all"
        onConfirm={() => {
          void onConfirm()
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

export default function RecycleBin({ tasks, groups, onRestore, onClearAll }: RecycleBinProps) {
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const atLimit = tasks.length >= RECYCLE_BIN_LIMIT

  if (tasks.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-8 py-8">
        <div className="max-w-md text-center">
          <p className="text-base font-semibold text-surface-text">Recycle bin is empty</p>
          <p className="mt-1 text-sm text-surface-muted">Deleted tasks will appear here.</p>
          <p className="mt-3 text-xs text-surface-muted">
            Keeps up to {RECYCLE_BIN_LIMIT} deleted tasks. Older items are removed automatically when the limit is
            reached.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-xl space-y-3">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-surface-text">Recycle Bin</h1>
            <p className="mt-1 text-sm text-surface-muted">
              {tasks.length} deleted task{tasks.length === 1 ? '' : 's'}
              {atLimit ? ` · limit of ${RECYCLE_BIN_LIMIT} reached` : ''}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-surface-muted">
              Stores up to {RECYCLE_BIN_LIMIT} deleted tasks. When full, the oldest deleted task is permanently removed
              to make room for new deletions.
            </p>
          </div>
          <ClearAllButton onConfirm={onClearAll} count={tasks.length} />
        </div>

        {tasks.map((task) => {
          const group = task.groupId != null ? groupById.get(task.groupId) : null
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-text">{task.title}</p>
                <p className="mt-0.5 text-xs text-surface-muted">
                  {group ? group.name : 'No board'} · Deleted {formatDeletedTime(task.deletedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onRestore(task)}
                className="shrink-0 rounded-xl border border-surface-border px-3 py-1.5 text-xs font-medium text-surface-text transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600"
              >
                Restore
              </button>
            </div>
          )
        })}
      </div>
    </main>
  )
}
