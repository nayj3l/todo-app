import { useEffect, useRef, useState } from 'react'

interface CommentComposerProps {
  expanded: boolean
  onAddComment: (text: string) => Promise<void>
}

export default function CommentComposer({ expanded, onAddComment }: CommentComposerProps) {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!expanded) {
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [expanded])

  async function handleSubmit() {
    const text = draft.trim()
    if (!text || submitting) {
      return
    }
    setSubmitting(true)
    try {
      await onAddComment(text)
      setDraft('')
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div
      className="w-full min-w-0 border-t border-surface-border bg-[#FAFAFB] px-4 py-3"
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={`rounded-xl border bg-white px-3 py-2 transition focus-within:ring-2 ${
          draft.length > 0
            ? 'border-brand-500 focus-within:border-brand-500 focus-within:ring-brand-100'
            : 'border-[#EBEBF0] focus-within:border-brand-500 focus-within:ring-brand-100'
        }`}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Write a comment..."
          disabled={submitting}
          className="min-h-[36px] w-full resize-none border-0 bg-transparent text-xs leading-relaxed text-surface-text outline-none placeholder:text-[#A0A0AC] focus:outline-none focus:ring-0 disabled:opacity-60"
        />
      </div>
    </div>
  )
}
