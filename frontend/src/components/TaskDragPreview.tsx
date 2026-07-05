import type { Task } from '../types/board'
import { getPriorityOption } from '../types/priority'

interface TaskDragPreviewProps {
  task: Task
  wrapTaskTitles: boolean
}

export default function TaskDragPreview({ task, wrapTaskTitles }: TaskDragPreviewProps) {
  const priorityOption = getPriorityOption(task.priority ?? 'NONE')
  const usePriorityAccent = priorityOption.value !== 'NONE'
  const commentCount = task.comments?.length ?? 0

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-xl ${
        task.done ? 'border-[#DCFCE7] bg-[#F0FDF4]' : 'border-surface-border bg-white'
      }`}
      style={
        usePriorityAccent
          ? { boxShadow: `inset 2px 0 0 ${priorityOption.color}, 0 12px 28px rgba(16, 24, 40, 0.12)` }
          : undefined
      }
    >
      <div className={`flex gap-3 px-4 py-3 ${wrapTaskTitles ? 'items-start' : 'items-center'}`}>
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            task.done ? 'border-[#86EFAC] bg-[#86EFAC]' : 'border-[#D5D5DE] bg-white'
          }`}
          aria-hidden="true"
        >
          {task.done && (
            <svg
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5 text-green-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>

        <span
          className={`min-w-0 flex-1 text-sm leading-snug ${
            wrapTaskTitles ? 'whitespace-normal break-words' : 'truncate'
          } ${task.done ? 'text-[#6B9080] line-through decoration-[#9DC4AD]/80' : 'text-surface-text'}`}
        >
          {task.title}
        </span>

        {commentCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-[#9A9AA8]" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[11px] font-medium tabular-nums">{commentCount}</span>
          </span>
        )}

        {usePriorityAccent && (
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: priorityOption.color }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
