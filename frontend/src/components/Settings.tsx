import type { AppSettings } from '../types/settings'

interface SettingsProps {
  settings: AppSettings
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export default function Settings({ settings, onUpdateSetting }: SettingsProps) {
  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-surface-text">Settings</h1>
        <p className="mt-1 text-sm text-surface-muted">Customize how your wedding planner works.</p>

        <section className="mt-8 rounded-2xl border border-surface-border bg-white shadow-card">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="text-sm font-semibold text-surface-text">Tasks</h2>
            <p className="mt-0.5 text-xs text-surface-muted">How you rename task cards on the board.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-[#FAFAFB]">
            <input
              type="checkbox"
              checked={settings.doubleClickRename}
              onChange={(event) => onUpdateSetting('doubleClickRename', event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D5D5DE] text-brand-500 focus:ring-brand-100"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-surface-text">
                Double-click task name to rename
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-surface-muted">
                When off, right-click a task and choose Rename. When on, you can also double-click the
                task title to edit it inline.
              </span>
            </span>
          </label>
        </section>
      </div>
    </main>
  )
}
