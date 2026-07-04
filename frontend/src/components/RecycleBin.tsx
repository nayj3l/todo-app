import type { Task, TaskGroup } from '../types/board'

interface RecycleBinProps {
  tasks: Task[]
  groups: TaskGroup[]
  onRestore: (task: Task) => Promise<void>
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

export default function RecycleBin({ tasks, groups, onRestore }: RecycleBinProps) {
  const groupById = new Map(groups.map((group) => [group.id, group]))

  if (tasks.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-8 py-8">
        <div className="text-center">
          <p className="text-base font-semibold text-surface-text">Recycle bin is empty</p>
          <p className="mt-1 text-sm text-surface-muted">Deleted tasks will appear here.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-xl space-y-3">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-surface-text">Recycle Bin</h1>
          <p className="mt-1 text-sm text-surface-muted">{tasks.length} deleted task(s)</p>
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
                  {group ? group.name : 'No project'} · Deleted {formatDeletedTime(task.deletedAt)}
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
