import type { Toast, ToastState } from '../hooks/useToast'

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

function ToastIcon({ state }: { state: ToastState }) {
  if (state === 'loading') {
    return (
      <svg
        className="h-4 w-4 shrink-0 animate-spin text-brand-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 14.9-4"
        />
      </svg>
    )
  }

  if (state === 'success') {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  }

  return (
    <svg
      className="h-4 w-4 shrink-0 text-red-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  )
}

function messageClass(state: ToastState) {
  if (state === 'error') {
    return 'text-red-700'
  }
  if (state === 'loading') {
    return 'text-surface-muted'
  }
  return 'text-surface-text'
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed bottom-14 right-6 z-40 flex w-[min(20rem,calc(100vw-3rem))] flex-col items-end gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast-enter pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border border-surface-border bg-white/95 px-3.5 py-2.5 shadow-card backdrop-blur-sm"
          role="status"
        >
          <ToastIcon state={toast.state} />
          <p className={`min-w-0 flex-1 text-sm leading-snug ${messageClass(toast.state)}`}>
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-0.5 text-surface-muted transition hover:bg-[#F3F3F6] hover:text-surface-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
