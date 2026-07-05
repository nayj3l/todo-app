import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PROJECT_NAME } from '../constants/projects'
import type { AuthUser } from '../types/auth'
import type { ActiveView, TaskGroup } from '../types/board'
import ConfirmDialog from './ConfirmDialog'
import PendingSyncIndicator from './PendingSyncIndicator'
import ProjectContextMenu from './ProjectContextMenu'

interface SidebarProps {
  groups: TaskGroup[]
  activeView: ActiveView
  totalOpen: number
  recycleCount: number
  activityCount: number
  pendingCount?: number
  showPendingSync?: boolean
  pendingSyncing?: boolean
  onViewPendingSync?: () => void
  onSyncPending?: () => void
  user: AuthUser
  onSelectView: (view: ActiveView) => void
  onCreateGroup: (name: string) => Promise<void>
  onRenameGroup: (groupId: number, name: string) => Promise<void>
  onDeleteGroup: (groupId: number) => Promise<void>
  onSignOut: () => Promise<void>
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function blurFocusedElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const SIDEBAR_COLLAPSED_KEY = 'altar-board-sidebar-collapsed'

function loadSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function tabClass(isActive: boolean) {
  return isActive
    ? 'border-l-[#7C5CFC] bg-[#EDE9FE] font-semibold text-[#5B3FD6] shadow-sm'
    : 'border-l-transparent bg-transparent font-normal text-[#55556A] hover:bg-[#FAFAFB]'
}

function sidebarNavClass(collapsed: boolean, isActive: boolean) {
  if (collapsed) {
    return `justify-center px-2 ${isActive ? 'bg-[#EDE9FE] text-[#5B3FD6]' : 'text-[#55556A] hover:bg-[#FAFAFB]'}`
  }
  return tabClass(isActive)
}

export default function Sidebar({
  groups,
  activeView,
  totalOpen,
  recycleCount,
  activityCount,
  pendingCount = 0,
  showPendingSync = false,
  pendingSyncing = false,
  onViewPendingSync,
  onSyncPending,
  user,
  onSelectView,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onSignOut,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [menu, setMenu] = useState<{ group: TaskGroup; x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskGroup | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const skipCreateBlurRef = useRef(false)
  const creatingProjectRef = useRef(false)

  const navViews = useMemo<ActiveView[]>(
    () => [
      'all',
      ...groups.map((group) => group.id),
      'recycle',
      ...(showPendingSync ? (['pending'] as ActiveView[]) : []),
      'activity',
      'settings',
    ],
    [groups, showPendingSync],
  )

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  useEffect(() => {
    if (!creatingProject) {
      return
    }
    requestAnimationFrame(() => {
      createInputRef.current?.focus()
      createInputRef.current?.select()
    })
  }, [creatingProject])

  useEffect(() => {
    if (editingGroupId != null) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingGroupId])

  useEffect(() => {
    const activeItem = document.querySelector(`[data-sidebar-view="${String(activeView)}"]`)
    activeItem?.scrollIntoView({ block: 'nearest' })
  }, [activeView])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (creatingProject || editingGroupId != null) {
        return
      }

      const currentIndex = navViews.findIndex((view) => view === activeView)
      if (currentIndex === -1) {
        return
      }

      const nextIndex =
        event.key === 'ArrowUp'
          ? Math.max(0, currentIndex - 1)
          : Math.min(navViews.length - 1, currentIndex + 1)

      if (nextIndex === currentIndex) {
        return
      }

      event.preventDefault()
      blurFocusedElement()

      const nextView = navViews[nextIndex]
      if (typeof nextView === 'number') {
        setProjectsExpanded(true)
        if (collapsed) {
          setCollapsed(false)
        }
      }
      onSelectView(nextView)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeView, collapsed, creatingProject, editingGroupId, navViews, onSelectView])

  function beginCreateProject() {
    setProjectsExpanded(true)
    setCreatingProject(true)
    setNewProjectName('')
  }

  function cancelCreate() {
    setCreatingProject(false)
    setNewProjectName('')
  }

  async function commitCreate() {
    if (creatingProjectRef.current) {
      return
    }
    creatingProjectRef.current = true
    const name = newProjectName.trim() || DEFAULT_PROJECT_NAME
    setCreatingProject(false)
    setNewProjectName('')
    try {
      await onCreateGroup(name)
    } finally {
      creatingProjectRef.current = false
    }
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
    setDeleteTarget(group)
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }
    void onDeleteGroup(deleteTarget.id)
    setDeleteTarget(null)
  }

  const navItemClass =
    'outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 focus-visible:ring-offset-1'

  return (
    <aside
      className={`sidebar-shell sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-surface-border bg-white py-6 ${
        collapsed ? 'w-[72px] px-3' : 'w-[260px] px-5'
      }`}
    >
      <div
        className={`mb-6 flex shrink-0 items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
          A
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-muted transition hover:bg-[#FAFAFB] hover:text-surface-text"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        data-sidebar-view="all"
        aria-current={activeView === 'all' ? 'page' : undefined}
        onClick={() => onSelectView('all')}
        title={collapsed ? 'All projects' : undefined}
        className={`mb-6 flex w-full items-center rounded-xl border-l-[3px] py-2.5 text-sm transition ${navItemClass} ${sidebarNavClass(collapsed, activeView === 'all')} ${
          collapsed ? 'pl-2 pr-2' : 'justify-between pl-2.5 pr-3'
        }`}
      >
        <span className={`flex items-center ${collapsed ? '' : 'gap-2.5'}`}>
          {activeView === 'all' ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#7C5CFC] text-white">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          ) : (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#ECECF0] text-[#8E8E98]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
          )}
          <span className={`sidebar-label overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'}`}>
            All
          </span>
        </span>
        {!collapsed && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
              activeView === 'all'
                ? 'bg-[#7C5CFC] text-white'
                : 'bg-[#EEEEF2] text-[#8E8E98]'
            }`}
          >
            {totalOpen}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-surface-muted">Projects</span>
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
              className={`transition-transform duration-300 ${projectsExpanded ? 'rotate-0' : '-rotate-90'}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!collapsed && (
          <div
            className={`sidebar-projects-grid min-h-0 flex-1 ${
              projectsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <nav className="sidebar-projects-scroll min-h-0 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5 pb-1">
              {creatingProject ? (
                <div className="flex w-full items-center gap-3 rounded-xl border-l-[3px] border-l-transparent bg-[#FAFAFB] py-2 pl-2.5 pr-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#D5D5DE]" />
                  <input
                    ref={createInputRef}
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    onBlur={() => {
                      if (skipCreateBlurRef.current) {
                        skipCreateBlurRef.current = false
                        return
                      }
                      void commitCreate()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        skipCreateBlurRef.current = true
                        void commitCreate()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        cancelCreate()
                      }
                    }}
                    placeholder={DEFAULT_PROJECT_NAME}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-surface-text outline-none placeholder:text-[#B8B8C3]"
                    aria-label="Project name"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={beginCreateProject}
                  className={`flex w-full items-center gap-3 rounded-xl border-l-[3px] border-l-transparent py-2 pl-2.5 pr-3 text-left text-sm text-[#9A9AA8] transition hover:bg-[#FAFAFB] hover:text-surface-muted ${navItemClass}`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                    className="block shrink-0"
                  >
                    <circle
                      cx="5"
                      cy="5"
                      r="4"
                      stroke="#D5D5DE"
                      strokeWidth="0.85"
                      strokeDasharray="1.75 1.4"
                    />
                    <path
                      d="M5 3.15V6.85M3.15 5H6.85"
                      stroke="#B8B8C3"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="min-w-0 flex-1 truncate">New project</span>
                </button>
              )}

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
                      data-sidebar-view={group.id}
                      aria-current={activeView === group.id ? 'page' : undefined}
                      onClick={() => onSelectView(group.id)}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setMenu({ group, x: event.clientX, y: event.clientY })
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border-l-[3px] py-2 pl-2.5 pr-3 text-left text-sm transition ${navItemClass} ${tabClass(activeView === group.id)}`}
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

            </nav>
          </div>
        )}
      </div>

      <div className="mt-auto shrink-0 space-y-1 border-t border-surface-border pt-4">
        <button
          type="button"
          data-sidebar-view="recycle"
          aria-current={activeView === 'recycle' ? 'page' : undefined}
          onClick={() => onSelectView('recycle')}
          title={collapsed ? 'Recycle Bin' : undefined}
          className={`flex w-full items-center rounded-xl border-l-[3px] py-2.5 text-sm transition ${navItemClass} ${sidebarNavClass(collapsed, activeView === 'recycle')} ${
            collapsed ? 'justify-center px-2' : 'justify-between pl-2.5 pr-3'
          }`}
        >
          <span className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            <span className={`sidebar-label overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>
              Recycle Bin
            </span>
          </span>
          {!collapsed && recycleCount > 0 && (
            <span className="rounded-full bg-[#EEEEF2] px-2 py-0.5 text-xs text-surface-muted">{recycleCount}</span>
          )}
        </button>

        {showPendingSync && (
          <button
            type="button"
            data-sidebar-view="pending"
            aria-current={activeView === 'pending' ? 'page' : undefined}
            onClick={() => onSelectView('pending')}
            title={collapsed ? 'Pending sync' : undefined}
            className={`flex w-full items-center rounded-xl border-l-[3px] py-2.5 text-sm transition ${navItemClass} ${
              collapsed
                ? activeView === 'pending'
                  ? 'justify-center bg-amber-50 px-2 text-amber-900'
                  : 'justify-center px-2 text-amber-900/80 hover:bg-amber-50/70'
                : activeView === 'pending'
                  ? 'border-l-amber-500 bg-amber-50 font-semibold text-amber-900 shadow-sm justify-between pl-2.5 pr-3'
                  : 'border-l-transparent bg-transparent font-normal text-amber-900/80 hover:bg-amber-50/70 justify-between pl-2.5 pr-3'
            }`}
          >
            <span className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              <span className={`sidebar-label overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>
                Pending sync
              </span>
            </span>
            {!collapsed && pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800">
                {pendingCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          data-sidebar-view="activity"
          aria-current={activeView === 'activity' ? 'page' : undefined}
          onClick={() => onSelectView('activity')}
          title={collapsed ? 'Activity Log' : undefined}
          className={`flex w-full items-center rounded-xl border-l-[3px] py-2.5 text-sm transition ${navItemClass} ${sidebarNavClass(collapsed, activeView === 'activity')} ${
            collapsed ? 'justify-center px-2' : 'justify-between pl-2.5 pr-3'
          }`}
        >
          <span className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span className={`sidebar-label overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>
              Activity Log
            </span>
          </span>
          {!collapsed && activityCount > 0 && (
            <span className="rounded-full bg-[#EEEEF2] px-2 py-0.5 text-xs tabular-nums text-surface-muted">
              {activityCount}
            </span>
          )}
        </button>

        <button
          type="button"
          data-sidebar-view="settings"
          aria-current={activeView === 'settings' ? 'page' : undefined}
          onClick={() => onSelectView('settings')}
          title={collapsed ? 'Settings' : undefined}
          className={`flex w-full items-center rounded-xl border-l-[3px] py-2.5 text-sm transition ${navItemClass} ${sidebarNavClass(collapsed, activeView === 'settings')} ${
            collapsed ? 'justify-center gap-0 px-2' : 'gap-2 pl-2.5 pr-3'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span className={`sidebar-label overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>
            Settings
          </span>
        </button>

        {!collapsed && showPendingSync && onViewPendingSync && onSyncPending && (
          <PendingSyncIndicator
            count={pendingCount}
            syncing={pendingSyncing}
            onView={onViewPendingSync}
            onSyncNow={onSyncPending}
          />
        )}

        <div className={`flex items-center rounded-xl py-2 ${collapsed ? 'justify-center px-0' : 'gap-3 px-2'}`}>
          {user.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-sm font-semibold text-[#5B3FD6]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1A1A2E]">{user.name}</p>
              {user.mode === 'guest' ? (
                <p className="truncate text-xs text-amber-700">Guest · saved on this browser</p>
              ) : user.email ? (
                <p className="truncate text-xs text-surface-muted">{user.email}</p>
              ) : null}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          title={collapsed ? 'Sign out' : undefined}
          className={`flex w-full items-center rounded-xl border border-[#E8E8ED] text-sm text-[#55556A] transition hover:bg-[#FAFAFB] ${
            collapsed ? 'justify-center px-2 py-2' : 'justify-center px-3 py-2'
          }`}
        >
          {collapsed ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          ) : (
            'Sign out'
          )}
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

      <ConfirmDialog
        open={deleteTarget != null}
        title={deleteTarget ? `Delete "${deleteTarget.name}"?` : ''}
        description={
          deleteTarget && deleteTarget.taskCount > 0
            ? `${deleteTarget.taskCount === 1 ? '1 task' : `${deleteTarget.taskCount} tasks`} will be moved to Recycle Bin.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  )
}
