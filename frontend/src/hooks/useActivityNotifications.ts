import { useCallback } from 'react'
import type { ActivityLogMeta } from '../types/activityLog'
import { useActivityLog } from './useActivityLog'
import { useToast } from './useToast'

export function useActivityNotifications() {
  const { toasts, beginActivity, completeActivity, failActivity, dismissToast } = useToast()
  const { entries, addEntry, clearLog } = useActivityLog()

  const completeActivityWithLog = useCallback(
    (id: number, message: string, meta?: ActivityLogMeta) => {
      completeActivity(id, message)
      addEntry({ message, status: 'success', meta })
    },
    [addEntry, completeActivity],
  )

  const failActivityWithLog = useCallback(
    (id: number, message: string, meta?: ActivityLogMeta) => {
      failActivity(id, message)
      addEntry({ message, status: 'error', meta })
    },
    [addEntry, failActivity],
  )

  return {
    toasts,
    beginActivity,
    completeActivity: completeActivityWithLog,
    failActivity: failActivityWithLog,
    dismissToast,
    activityEntries: entries,
    clearActivityLog: clearLog,
  }
}
