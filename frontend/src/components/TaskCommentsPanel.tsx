import { useEffect, useRef, useState } from 'react'
import type { TaskComment } from '../types/board'
import CommentTimestamp from './CommentTimestamp'

interface TaskCommentsPanelProps {
  comments: TaskComment[]
  onUpdateComment: (comment: TaskComment, text: string) => Promise<void>
  onDeleteComment: (comment: TaskComment) => Promise<void>
}

export default function TaskCommentsPanel({
  comments,
  onUpdateComment,
  onDeleteComment,
}: TaskCommentsPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingId != null) {
      editRef.current?.focus()
      editRef.current?.select()
    }
  }, [editingId])

  if (comments.length === 0) {
    return null
  }

  function beginEdit(comment: TaskComment) {
    setEditingId(comment.id)
    setDraft(comment.text)
  }

  async function commitEdit(comment: TaskComment) {
    const next = draft.trim()
    setEditingId(null)
    if (!next || next === comment.text) {
      return
    }
    setSaving(true)
    try {
      await onUpdateComment(comment, next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="border-t border-surface-border bg-[#FAFAFB] px-4 pt-3"
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <div className="space-y-1.5 pb-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="group/comment flex items-start justify-between gap-2 rounded-lg border border-[#EBEBF0] bg-[#F5F5F7]/60 px-2.5 py-2"
          >
            {editingId === comment.id ? (
              <textarea
                ref={editRef}
                value={draft}
                disabled={saving}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => void commitEdit(comment)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void commitEdit(comment)
                  }
                  if (event.key === 'Escape') {
                    setEditingId(null)
                    setDraft(comment.text)
                  }
                }}
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-md border border-brand-500 bg-white px-2 py-1 text-xs leading-relaxed text-[#6E6E7A] outline-none ring-2 ring-brand-100"
              />
            ) : (
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#6E6E7A]">
                {comment.text}
              </p>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              {editingId !== comment.id && (
                <div className="flex items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover/comment:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      beginEdit(comment)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[#A0A0AC] transition hover:bg-white hover:text-surface-text"
                    aria-label="Edit comment"
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void onDeleteComment(comment)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[#A0A0AC] transition hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete comment"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              )}
              <CommentTimestamp createdAt={comment.createdAt} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
