import { useEffect, useState } from 'react'
import type { ActivityLogEntry } from '../types/activityLog'

interface ActivityLogProps {
  entries: ActivityLogEntry[]
  onClear: () => void
}

const SHOW_DETAILS_KEY = 'todo-app-activity-log-show-details'

function loadShowDetails() {
  try {
    return localStorage.getItem(SHOW_DETAILS_KEY) === 'true'
  } catch {
    return false
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function dayLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function groupEntries(entries: ActivityLogEntry[]) {
  const groups = new Map<string, ActivityLogEntry[]>()

  entries.forEach((entry) => {
    const label = dayLabel(entry.createdAt)
    const bucket = groups.get(label) ?? []
    bucket.push(entry)
    groups.set(label, bucket)
  })

  return Array.from(groups.entries())
}

function entryHasDetails(entry: ActivityLogEntry) {
  const { subject, from, to, detail } = entry.meta ?? {}
  return Boolean(subject || (from && to) || detail)
}

function StatusIcon({ status }: { status: ActivityLogEntry['status'] }) {
  if (status === 'error') {
    return (
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </span>
    )
  }

  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

function ActivityEntryBody({
  entry,
  showDetails,
}: {
  entry: ActivityLogEntry
  showDetails: boolean
}) {
  const { subject, from, to, detail } = entry.meta ?? {}
  const hasChange = Boolean(from && to)
  const hasMeta = entryHasDetails(entry)

  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-surface-text">{entry.message}</p>

      {showDetails && hasMeta && (
        <>
          {subject && !hasChange && (
            <p className="mt-0.5 truncate text-xs text-[#55556A]">{subject}</p>
          )}

          {hasChange && (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              <span className="max-w-[45%] truncate text-surface-muted line-through decoration-surface-muted/60">
                {from}
              </span>
              <span className="shrink-0 text-surface-muted" aria-hidden="true">
                →
              </span>
              <span className="max-w-[45%] truncate font-medium text-surface-text">{to}</span>
            </p>
          )}

          {subject && hasChange && (
            <p className="mt-0.5 truncate text-[11px] text-surface-muted">{subject}</p>
          )}

          {detail && <p className="mt-0.5 truncate text-xs text-surface-muted">{detail}</p>}
        </>
      )}

      <p className={`text-[11px] text-surface-muted ${showDetails && hasMeta ? 'mt-1' : 'mt-0.5'}`}>
        {formatTimestamp(entry.createdAt)}
      </p>
    </div>
  )
}

export default function ActivityLog({ entries, onClear }: ActivityLogProps) {
  const [showDetails, setShowDetails] = useState(loadShowDetails)

  useEffect(() => {
    localStorage.setItem(SHOW_DETAILS_KEY, String(showDetails))
  }, [showDetails])

  if (entries.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-8 py-8">
        <div className="text-center">
          <p className="text-base font-semibold text-surface-text">No activity yet</p>
          <p className="mt-1 text-sm text-surface-muted">
            Create, edit, or delete tasks and boards — snapshots will show up here.
          </p>
        </div>
      </main>
    )
  }

  const groupedEntries = groupEntries(entries)

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-surface-text">Activity Log</h1>
            <p className="mt-1 text-sm text-surface-muted">
              {entries.length} snapshot{entries.length === 1 ? '' : 's'} saved locally
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-surface-text transition hover:bg-[#FAFAFB]">
              <input
                type="checkbox"
                checked={showDetails}
                onChange={(event) => setShowDetails(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#D5D5DE] text-brand-500 focus:ring-brand-100"
              />
              Show details
            </label>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-xl border border-surface-border px-3 py-1.5 text-xs font-medium text-surface-text transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Clear log
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {groupedEntries.map(([label, group]) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-surface-muted">
                {label}
              </h2>
              <div className="space-y-2">
                {group.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card"
                  >
                    <StatusIcon status={entry.status} />
                    <ActivityEntryBody entry={entry} showDetails={showDetails} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
