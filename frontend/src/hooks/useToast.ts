import { useCallback, useRef, useState } from 'react'

export type ToastState = 'loading' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  state: ToastState
}

const TOAST_DURATION_MS = 3200

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextIdRef = useRef(0)
  const dismissTimersRef = useRef(new Map<number, number>())

  const dismissToast = useCallback((id: number) => {
    const timer = dismissTimersRef.current.get(id)
    if (timer != null) {
      window.clearTimeout(timer)
      dismissTimersRef.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const scheduleDismiss = useCallback(
    (id: number) => {
      const existing = dismissTimersRef.current.get(id)
      if (existing != null) {
        window.clearTimeout(existing)
      }
      const timer = window.setTimeout(() => {
        dismissToast(id)
      }, TOAST_DURATION_MS)
      dismissTimersRef.current.set(id, timer)
    },
    [dismissToast],
  )

  const beginActivity = useCallback(() => {
    const id = ++nextIdRef.current
    setToasts((current) => [...current, { id, message: 'Saving...', state: 'loading' }])
    return id
  }, [])

  const completeActivity = useCallback(
    (id: number, message: string) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, message, state: 'success' } : toast,
        ),
      )
      scheduleDismiss(id)
    },
    [scheduleDismiss],
  )

  const failActivity = useCallback(
    (id: number, message: string) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, message, state: 'error' } : toast,
        ),
      )
      scheduleDismiss(id)
    },
    [scheduleDismiss],
  )

  return { toasts, beginActivity, completeActivity, failActivity, dismissToast }
}
