import { useCallback, useState } from 'react'

const STORAGE_KEY = 'todo-app-zoom'

export const MIN_ZOOM = 50
export const MAX_ZOOM = 200
export const DEFAULT_ZOOM = 100
export const ZOOM_STEP = 10

function loadZoom(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_ZOOM
    }
    const value = Number.parseInt(raw, 10)
    if (Number.isFinite(value) && value >= MIN_ZOOM && value <= MAX_ZOOM) {
      return value
    }
  } catch {
    // ignore
  }
  return DEFAULT_ZOOM
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function useZoom() {
  const [zoom, setZoomState] = useState(loadZoom)

  const setZoom = useCallback((value: number) => {
    const next = clampZoom(value)
    setZoomState(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }, [])

  const decrease = useCallback(() => {
    setZoomState((prev) => {
      const next = clampZoom(prev - ZOOM_STEP)
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const increase = useCallback(() => {
    setZoomState((prev) => {
      const next = clampZoom(prev + ZOOM_STEP)
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setZoom(DEFAULT_ZOOM)
  }, [setZoom])

  return { zoom, setZoom, decrease, increase, reset }
}
