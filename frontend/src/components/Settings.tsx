import { APP_NAME } from '../constants/app'
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
        <p className="mt-1 text-sm text-surface-muted">Customize how {APP_NAME} works.</p>

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

        <section className="mt-6 rounded-2xl border border-surface-border bg-white shadow-card">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="text-sm font-semibold text-surface-text">Project headers</h2>
            <p className="mt-0.5 text-xs text-surface-muted">
              Optional details shown under each project name on the board.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 border-b border-surface-border px-5 py-4 transition hover:bg-[#FAFAFB]">
            <input
              type="checkbox"
              checked={settings.showProjectTaskBreakdown}
              onChange={(event) => onUpdateSetting('showProjectTaskBreakdown', event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D5D5DE] text-brand-500 focus:ring-brand-100"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-surface-text">Show open and done breakdown</span>
              <span className="mt-1 block text-xs leading-relaxed text-surface-muted">
                Adds a second line under the project title with open, done, and filtered counts.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-[#FAFAFB]">
            <input
              type="checkbox"
              checked={settings.showProjectProgressBar}
              onChange={(event) => onUpdateSetting('showProjectProgressBar', event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D5D5DE] text-brand-500 focus:ring-brand-100"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-surface-text">Show progress bar</span>
              <span className="mt-1 block text-xs leading-relaxed text-surface-muted">
                Displays completion progress using each project&apos;s color. Off by default so the board
                stays focused on tasks.
              </span>
            </span>
          </label>
        </section>

        <section className="mt-6 rounded-2xl border border-surface-border bg-white shadow-card">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="text-sm font-semibold text-surface-text">Board layout</h2>
            <p className="mt-0.5 text-xs text-surface-muted">
              Switch between stacked list and kanban-style columns on All Projects.
            </p>
          </div>

          <div className="border-b border-surface-border px-5 py-4">
            <p className="mb-3 text-sm font-medium text-surface-text">Default view</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm transition hover:bg-[#FAFAFB] has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="boardView"
                  checked={settings.boardView === 'list'}
                  onChange={() => onUpdateSetting('boardView', 'list')}
                  className="text-brand-500 focus:ring-brand-100"
                />
                List
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm transition hover:bg-[#FAFAFB] has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="boardView"
                  checked={settings.boardView === 'columns'}
                  onChange={() => onUpdateSetting('boardView', 'columns')}
                  className="text-brand-500 focus:ring-brand-100"
                />
                Columns
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
