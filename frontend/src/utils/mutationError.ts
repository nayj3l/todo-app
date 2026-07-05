import { isQueuedSyncError } from '../lib/resilientApi'

export function mutationFailedQueued(error: unknown): boolean {
  return isQueuedSyncError(error)
}
