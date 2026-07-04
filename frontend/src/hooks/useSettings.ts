import { useCallback, useState } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings'

const STORAGE_KEY = 'todo-app-settings'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SETTINGS
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings)

  const setSettings = useCallback((next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      return value
    })
  }, [])

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    [setSettings],
  )

  return { settings, updateSetting }
}
