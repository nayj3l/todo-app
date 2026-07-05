import { runPendingOperation } from './board'
import {
  listPendingSyncItems,
  removePendingSyncItem,
  updatePendingSyncItem,
} from '../lib/pendingSyncQueue'
import { isBenignPendingSyncError } from '../utils/pendingSyncCoalesce'

export interface FlushPendingResult {
  synced: number
  failed: number
}

export async function flushPendingSyncQueue(): Promise<FlushPendingResult> {
  const items = listPendingSyncItems()
  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      await runPendingOperation(item.operation)
      removePendingSyncItem(item.id)
      synced += 1
    } catch (error) {
      if (isBenignPendingSyncError(error)) {
        removePendingSyncItem(item.id)
        synced += 1
        continue
      }
      failed += 1
      updatePendingSyncItem(item.id, {
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  return { synced, failed }
}
