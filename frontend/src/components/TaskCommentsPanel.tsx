import type { TaskComment } from '../types/board'

interface TaskCommentsPanelProps {
  comments: TaskComment[]
}

function formatCommentDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatCommentTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TaskCommentsPanel({ comments }: TaskCommentsPanelProps) {
  if (comments.length === 0) {
    return null
  }

  return (
    <div className="border-t border-surface-border bg-[#FAFAFB] px-4 pt-3">
      <div className="space-y-1.5 pb-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-[#EBEBF0] bg-[#F5F5F7]/60 px-2.5 py-2"
          >
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#6E6E7A]">
              {comment.text}
            </p>
            <div className="shrink-0 text-right leading-tight">
              <p className="text-[10px] text-[#A0A0AC]">{formatCommentTime(comment.createdAt)}</p>
              <p className="mt-0.5 text-[10px] text-[#A0A0AC]">{formatCommentDate(comment.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
