import { enqueuePendingSync } from './pendingSyncQueue'
import type { PendingSyncOperation } from '../types/pendingSync'

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 400

export class QueuedSyncError extends Error {
  readonly queued = true

  constructor(message: string) {
    super(message)
    this.name = 'QueuedSyncError'
  }
}

export function isQueuedSyncError(error: unknown): error is QueuedSyncError {
  return error instanceof QueuedSyncError
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true
  }
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return false
    }
    if (error.message.includes('Authentication required')) {
      return false
    }
    return true
  }
  return true
}

export async function withResilientSync<T>(
  label: string,
  operation: PendingSyncOperation,
  call: () => Promise<T>,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await call()
    } catch (error) {
      lastError = error
      if (!isRetryableError(error) || attempt === MAX_ATTEMPTS) {
        break
      }
      await delay(BASE_DELAY_MS * attempt)
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Request failed'
  enqueuePendingSync(label, operation, message)
  throw new QueuedSyncError(`${label} — saved locally, will sync when online.`)
}
