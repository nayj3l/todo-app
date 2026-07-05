import type { PendingSyncItem, PendingSyncOperation } from '../types/pendingSync'

const STORAGE_KEY = 'altar-board-pending-sync'
const CHANGE_EVENT = 'altar-pending-sync-changed'

function readQueue(): PendingSyncItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as PendingSyncItem[]
  } catch {
    return []
  }
}

function writeQueue(items: PendingSyncItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function listPendingSyncItems(): PendingSyncItem[] {
  return readQueue()
}

export function pendingSyncCount(): number {
  return readQueue().length
}

export function enqueuePendingSync(
  label: string,
  operation: PendingSyncOperation,
  lastError?: string,
): PendingSyncItem {
  const item: PendingSyncItem = {
    id: crypto.randomUUID(),
    label,
    operation,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError,
  }
  writeQueue([...readQueue(), item])
  return item
}

export function removePendingSyncItem(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id))
}

export function updatePendingSyncItem(id: string, patch: Partial<PendingSyncItem>) {
  writeQueue(
    readQueue().map((item) => (item.id === id ? { ...item, ...patch } : item)),
  )
}

export function subscribePendingSync(callback: () => void) {
  const handler = () => callback()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('online', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('online', handler)
  }
}
