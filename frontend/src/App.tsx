import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addComment,
  createTask,
  createGroup,
  deleteGroup,
  deleteTask,
  getBoard,
  getRecycleBin,
  mergeTaskUpdate,
  renameGroup,
  reorderTasks,
  restoreTask,
  setPriority,
  toggleDone,
  updateTaskTitle,
} from './api/board'
import RecycleBin from './components/RecycleBin'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import TaskBoard, { buildReorderPayload } from './components/TaskBoard'
import { useSettings } from './hooks/useSettings'
import type { ActiveView, Board, Task } from './types/board'
import type { TaskPriority } from './types/priority'

export default function App() {
  const [board, setBoard] = useState<Board>({ groups: [], tasks: [] })
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { settings, updateSetting } = useSettings()

  const loadBoard = useCallback(async () => {
    setError(null)
    try {
      const [boardData, recycleData] = await Promise.all([getBoard(), getRecycleBin()])
      setBoard(boardData)
      setDeletedTasks(recycleData.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  const groupedTasks = useMemo(
    () => board.tasks.filter((task) => task.groupId != null),
    [board.tasks],
  )

  const openCount = useMemo(
    () => groupedTasks.filter((task) => !task.done).length,
    [groupedTasks],
  )

  const handleToggleDone = useCallback(async (task: Task) => {
    const nextDone = !task.done

    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? { ...item, done: nextDone } : item,
      ),
    }))

    setSaving(true)
    try {
      const updated = await toggleDone(task.id, nextDone)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, done: task.done } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleSetPriority = useCallback(async (task: Task, priority: TaskPriority) => {
    const previous = task.priority ?? 'NONE'

    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? { ...item, priority } : item,
      ),
    }))

    setSaving(true)
    try {
      const updated = await setPriority(task.id, priority)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, priority: previous } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleReorder = useCallback(async (tasks: Task[]) => {
    setSaving(true)
    try {
      const items = buildReorderPayload(tasks)
      const updated = await reorderTasks(items)
      setBoard(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save order')
      await loadBoard()
    } finally {
      setSaving(false)
    }
  }, [loadBoard])

  const handleRenameGroup = useCallback(async (groupId: number, name: string) => {
    setBoard((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, name } : group)),
    }))

    setSaving(true)
    try {
      const updated = await renameGroup(groupId, name)
      setBoard((current) => ({
        ...current,
        groups: current.groups.map((group) => (group.id === groupId ? updated : group)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename project')
      await loadBoard()
    } finally {
      setSaving(false)
    }
  }, [loadBoard])

  const handleCreateGroup = useCallback(async (name: string) => {
    setSaving(true)
    try {
      const created = await createGroup(name)
      setBoard((current) => ({
        ...current,
        groups: [...current.groups, created],
      }))
      setActiveView(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    setBoard((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
      tasks: current.tasks.filter((task) => task.groupId !== groupId),
    }))
    setActiveView((current) => (current === groupId ? 'all' : current))

    setSaving(true)
    try {
      await deleteGroup(groupId)
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      await loadBoard()
    } finally {
      setSaving(false)
    }
  }, [loadBoard])

  const handleCreateTask = useCallback(async (groupId: number) => {
    setSaving(true)
    try {
      const created = await createTask('New task', groupId)
      setBoard((current) => ({
        ...current,
        tasks: [...current.tasks, { ...created, comments: [] }],
        groups: current.groups.map((group) =>
          group.id === groupId ? { ...group, taskCount: group.taskCount + 1 } : group,
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleRenameTask = useCallback(async (task: Task, title: string) => {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, title } : item)),
    }))

    setSaving(true)
    try {
      const updated = await updateTaskTitle(task.id, title)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, title: task.title } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to rename task')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleAddComment = useCallback(async (task: Task, text: string) => {
    setSaving(true)
    try {
      const comment = await addComment(task.id, text)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id
            ? { ...item, comments: [...(item.comments ?? []), comment] }
            : item,
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const handleDeleteTask = useCallback(async (task: Task) => {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== task.id),
      groups: current.groups.map((group) =>
        group.id === task.groupId ? { ...group, taskCount: Math.max(0, group.taskCount - 1) } : group,
      ),
    }))

    setSaving(true)
    try {
      await deleteTask(task.id)
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      await loadBoard()
    } finally {
      setSaving(false)
    }
  }, [loadBoard])

  const handleRestoreTask = useCallback(async (task: Task) => {
    setDeletedTasks((current) => current.filter((item) => item.id !== task.id))

    setSaving(true)
    try {
      const restored = await restoreTask(task.id)
      setBoard((current) => ({
        ...current,
        tasks: [...current.tasks, { ...restored, comments: restored.comments ?? [] }],
        groups: current.groups.map((group) =>
          group.id === restored.groupId ? { ...group, taskCount: group.taskCount + 1 } : group,
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore task')
      await loadBoard()
    } finally {
      setSaving(false)
    }
  }, [loadBoard])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-surface-muted">
        Loading wedding planner...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface-bg">
      <Sidebar
        groups={board.groups}
        activeView={activeView}
        totalOpen={openCount}
        recycleCount={deletedTasks.length}
        onSelectView={setActiveView}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {saving && (
        <div
          className="pointer-events-none fixed left-[280px] top-4 z-50 flex items-center gap-2 rounded-full border border-surface-border bg-white/95 px-3 py-1.5 text-xs font-medium text-surface-text shadow-card backdrop-blur-sm"
          aria-live="polite"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          Saving
        </div>
      )}

      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 shadow-card">
          {error}
        </div>
      )}

      {activeView === 'settings' ? (
        <Settings settings={settings} onUpdateSetting={updateSetting} />
      ) : activeView === 'recycle' ? (
        <RecycleBin tasks={deletedTasks} groups={board.groups} onRestore={handleRestoreTask} />
      ) : (
        <TaskBoard
          groups={board.groups}
          tasks={groupedTasks}
          activeGroupId={activeView === 'all' ? 'all' : activeView}
          doubleClickRename={settings.doubleClickRename}
          onToggleDone={handleToggleDone}
          onSetPriority={handleSetPriority}
          onReorder={handleReorder}
          onRenameGroup={handleRenameGroup}
          onRenameTask={handleRenameTask}
          onCreateTask={handleCreateTask}
          onAddComment={handleAddComment}
          onDeleteTask={handleDeleteTask}
          onSelectGroup={setActiveView}
        />
      )}
    </div>
  )
}
