interface PendingSyncIndicatorProps {
  count: number
  syncing: boolean
  onView: () => void
  onSyncNow: () => void
}

export default function PendingSyncIndicator({
  count,
  syncing,
  onView,
  onSyncNow,
}: PendingSyncIndicatorProps) {
  if (count === 0 && !syncing) {
    return null
  }

  const offline = !navigator.onLine

  return (
    <div
      className="mb-2 flex w-full items-center gap-1 rounded-xl border border-amber-100/80 bg-amber-50/50 px-1 py-1"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-amber-50"
        title="View pending changes"
      >
        {syncing ? (
          <svg
            className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 14.9-4" />
          </svg>
        ) : (
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
        )}
        <span className="truncate text-xs font-medium text-[#6B5A3E]">
          {syncing ? 'Syncing…' : `${count} pending`}
        </span>
        {offline && !syncing && (
          <span className="shrink-0 text-[10px] text-amber-700/80">offline</span>
        )}
      </button>

      {!syncing && !offline && count > 0 && (
        <>
          <div className="h-4 w-px shrink-0 bg-amber-200/80" aria-hidden="true" />
          <button
            type="button"
            onClick={() => void onSyncNow()}
            title="Sync now"
            aria-label="Sync now"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-700/70 transition hover:bg-amber-100/80 hover:text-amber-800"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
