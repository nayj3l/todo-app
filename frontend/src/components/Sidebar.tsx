import { useEffect, useRef, useState } from 'react'
import type { ActiveView, TaskGroup } from '../types/board'
import ProjectContextMenu from './ProjectContextMenu'

interface SidebarProps {
  groups: TaskGroup[]
  activeView: ActiveView
  totalOpen: number
  recycleCount: number
  onSelectView: (view: ActiveView) => void
  onCreateGroup: (name: string) => Promise<void>
  onRenameGroup: (groupId: number, name: string) => Promise<void>
  onDeleteGroup: (groupId: number) => Promise<void>
}

export default function Sidebar({
  groups,
  activeView,
  totalOpen,
  recycleCount,
  onSelectView,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: SidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [menu, setMenu] = useState<{ group: TaskGroup; x: number; y: number } | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingProject) {
      createInputRef.current?.focus()
    }
  }, [creatingProject])

  useEffect(() => {
    if (editingGroupId != null) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingGroupId])

  async function commitCreate() {
    const name = newProjectName.trim()
    setCreatingProject(false)
    setNewProjectName('')
    if (!name) {
      return
    }
    await onCreateGroup(name)
  }

  async function commitRename(group: TaskGroup) {
    const next = editDraft.trim()
    setEditingGroupId(null)
    if (!next || next === group.name) {
      return
    }
    await onRenameGroup(group.id, next)
  }

  function handleDelete(group: TaskGroup) {
    const taskLabel = group.taskCount === 1 ? '1 task' : `${group.taskCount} tasks`
    const message =
      group.taskCount > 0
        ? `Delete "${group.name}" and move ${taskLabel} to Recycle Bin?`
        : `Delete "${group.name}"?`
    if (window.confirm(message)) {
      void onDeleteGroup(group.id)
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-surface-border bg-white px-5 py-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
          W
        </div>
        <button type="button" className="text-surface-muted hover:text-surface-text" aria-label="Collapse sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="relative mb-6">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          placeholder="Search"
          className="w-full rounded-xl border border-surface-border bg-[#FAFAFB] py-2.5 pl-10 pr-3 text-sm text-surface-text outline-none placeholder:text-surface-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <button
        type="button"
        onClick={() => onSelectView('all')}
        className={`mb-6 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          activeView === 'all'
            ? 'bg-brand-50 text-brand-600'
            : 'text-surface-text hover:bg-[#FAFAFB]'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-500 text-[10px] text-white">
            ✓
          </span>
          All
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            activeView === 'all' ? 'bg-brand-500 text-white' : 'bg-[#EEEEF2] text-surface-muted'
          }`}
        >
          {totalOpen}
        </span>
      </button>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-surface-muted">Projects</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setProjectsExpanded(true)
              setCreatingProject(true)
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-surface-muted transition hover:bg-[#FAFAFB] hover:text-surface-text"
            aria-label="Add project"
            title="Add project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setProjectsExpanded((current) => !current)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-surface-muted transition hover:bg-[#FAFAFB] hover:text-surface-text"
            aria-label={projectsExpanded ? 'Collapse projects' : 'Expand projects'}
            aria-expanded={projectsExpanded}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${projectsExpanded ? 'rotate-0' : '-rotate-90'}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {projectsExpanded && (
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id}>
              {editingGroupId === group.id ? (
                <input
                  ref={editInputRef}
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  onBlur={() => void commitRename(group)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void commitRename(group)
                    }
                    if (event.key === 'Escape') {
                      setEditingGroupId(null)
                    }
                  }}
                  className="w-full rounded-xl border border-brand-500 bg-white px-3 py-2 text-sm text-surface-text outline-none ring-2 ring-brand-100"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectView(group.id)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setMenu({ group, x: event.clientX, y: event.clientY })
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeView === group.id
                      ? 'bg-[#FAFAFB] font-medium text-surface-text'
                      : 'text-[#55556A] hover:bg-[#FAFAFB]'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  {group.taskCount > 0 && (
                    <span className="shrink-0 text-[11px] tabular-nums text-surface-muted">{group.taskCount}</span>
                  )}
                </button>
              )}
            </div>
          ))}

          {creatingProject && (
            <input
              ref={createInputRef}
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onBlur={() => void commitCreate()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitCreate()
                }
                if (event.key === 'Escape') {
                  setCreatingProject(false)
                  setNewProjectName('')
                }
              }}
              placeholder="Project name..."
              className="w-full rounded-xl border border-brand-500 bg-white px-3 py-2 text-sm text-surface-text outline-none ring-2 ring-brand-100"
            />
          )}
        </nav>
      )}

      <div className="mt-auto space-y-1 border-t border-surface-border pt-4">
        <button
          type="button"
          onClick={() => onSelectView('recycle')}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            activeView === 'recycle'
              ? 'bg-[#FAFAFB] font-medium text-surface-text'
              : 'text-[#55556A] hover:bg-[#FAFAFB]'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Recycle Bin
          </span>
          {recycleCount > 0 && (
            <span className="rounded-full bg-[#EEEEF2] px-2 py-0.5 text-xs text-surface-muted">{recycleCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectView('settings')}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            activeView === 'settings'
              ? 'bg-[#FAFAFB] font-medium text-surface-text'
              : 'text-[#55556A] hover:bg-[#FAFAFB]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Settings
        </button>
      </div>

      {menu && (
        <ProjectContextMenu
          x={menu.x}
          y={menu.y}
          onRename={() => {
            setEditDraft(menu.group.name)
            setEditingGroupId(menu.group.id)
          }}
          onDelete={() => handleDelete(menu.group)}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  )
}
