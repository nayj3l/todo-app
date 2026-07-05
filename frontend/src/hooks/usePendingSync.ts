import { useCallback, useEffect, useState } from 'react'
import { flushPendingSyncQueue } from '../api/pendingSync'
import {
  listPendingSyncItems,
  pendingSyncCount,
  subscribePendingSync,
} from '../lib/pendingSyncQueue'
import type { PendingSyncItem } from '../types/pendingSync'

export function usePendingSync(enabled: boolean, onSynced?: () => void) {
  const [items, setItems] = useState<PendingSyncItem[]>(() => listPendingSyncItems())
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(() => {
    setItems(listPendingSyncItems())
  }, [])

  const flush = useCallback(async () => {
    if (!enabled || syncing || pendingSyncCount() === 0) {
      return { synced: 0, failed: 0 }
    }
    setSyncing(true)
    try {
      const result = await flushPendingSyncQueue()
      refresh()
      if (result.synced > 0) {
        onSynced?.()
      }
      return result
    } finally {
      setSyncing(false)
    }
  }, [enabled, onSynced, refresh, syncing])

  useEffect(() => {
    if (!enabled) {
      return
    }
    refresh()
    return subscribePendingSync(() => {
      refresh()
      if (navigator.onLine && pendingSyncCount() > 0) {
        void flush()
      }
    })
  }, [enabled, flush, refresh])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const interval = window.setInterval(() => {
      if (navigator.onLine && pendingSyncCount() > 0) {
        void flush()
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [enabled, flush])

  return {
    items,
    pendingCount: items.length,
    syncing,
    flush,
    refresh,
  }
}
