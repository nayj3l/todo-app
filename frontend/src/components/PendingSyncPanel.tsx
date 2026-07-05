import { useState } from 'react'
import type { PendingSyncItem } from '../types/pendingSync'
import ConfirmDialog from './ConfirmDialog'

interface PendingSyncPanelProps {
  items: PendingSyncItem[]
  syncing: boolean
  onSyncNow: () => void
  onDismiss: (id: string) => void
  onClearAll: () => void
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PendingSyncPanel({
  items,
  syncing,
  onSyncNow,
  onDismiss,
  onClearAll,
}: PendingSyncPanelProps) {
  const [clearOpen, setClearOpen] = useState(false)

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1A2E]">Pending sync</h1>
            <p className="mt-1 text-sm text-surface-muted">
              Changes saved locally while offline or after failed saves. They sync automatically when you&apos;re back
              online, in order, one action at a time.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => void onSyncNow()}
              disabled={syncing || items.length === 0 || !navigator.onLine}
              className="rounded-xl bg-[#5B3FD6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4C34B8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>

        {!navigator.onLine && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You&apos;re offline. Pending changes will sync when your connection returns.
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-12 text-center shadow-card">
            <p className="text-sm font-medium text-surface-text">All changes are synced</p>
            <p className="mt-1 text-xs text-surface-muted">Nothing waiting to upload.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A2E]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-surface-muted">{formatWhen(item.createdAt)}</p>
                    {item.lastError && <p className="mt-2 text-xs text-red-600">{item.lastError}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="shrink-0 text-xs text-surface-muted transition hover:text-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={clearOpen}
        title="Clear pending sync?"
        description="Remove all queued changes from this device. Anything not yet uploaded to the server will be discarded."
        confirmLabel="Clear all"
        onConfirm={() => {
          onClearAll()
          setClearOpen(false)
        }}
        onCancel={() => setClearOpen(false)}
      />
    </main>
  )
}
