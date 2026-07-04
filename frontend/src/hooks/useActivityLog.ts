import { useCallback, useState } from 'react'
import type { ActivityLogEntry, ActivityLogInput } from '../types/activityLog'

const STORAGE_KEY = 'todo-app-activity-log'
const MAX_ENTRIES = 200

function loadEntries(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as ActivityLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistEntries(entries: ActivityLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(loadEntries)

  const addEntry = useCallback(({ message, status, meta }: ActivityLogInput) => {
    const entry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      status,
      createdAt: new Date().toISOString(),
      ...(meta ? { meta } : {}),
    }

    setEntries((current) => {
      const next = [entry, ...current].slice(0, MAX_ENTRIES)
      persistEntries(next)
      return next
    })
  }, [])

  const clearLog = useCallback(() => {
    setEntries([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { entries, addEntry, clearLog }
}
