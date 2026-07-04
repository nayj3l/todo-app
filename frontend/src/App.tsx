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
import ActivityLog from './components/ActivityLog'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import TaskBoard, { buildReorderPayload, insertTaskInGroup } from './components/TaskBoard'
import ToastContainer from './components/ToastContainer'
import ZoomControl from './components/ZoomControl'
import { useActivityNotifications } from './hooks/useActivityNotifications'
import { useTaskFilters } from './hooks/useTaskFilters'
import { useSettings } from './hooks/useSettings'
import { useZoom } from './hooks/useZoom'
import type { ActiveView, Board, Task } from './types/board'
import { getPriorityOption, type TaskPriority } from './types/priority'
import type { AppSettings } from './types/settings'
import { DEFAULT_TASK_TITLE } from './constants/tasks'
import { truncateActivityText } from './utils/activityLog'

function groupNameFor(board: Board, groupId: number | null | undefined) {
  if (groupId == null) {
    return undefined
  }
  return board.groups.find((group) => group.id === groupId)?.name
}

export default function App() {
  const [board, setBoard] = useState<Board>({ groups: [], tasks: [] })
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { settings, updateSetting } = useSettings()
  const {
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    clearFilters,
  } = useTaskFilters()
  const { zoom, setZoom, decrease, increase, reset } = useZoom()
  const { toasts, beginActivity, completeActivity, failActivity, dismissToast, activityEntries, clearActivityLog } =
    useActivityNotifications()

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

  const handleUpdateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const toastId = beginActivity()
      updateSetting(key, value)
      completeActivity(toastId, 'Settings saved', {
        detail:
          key === 'doubleClickRename'
            ? value
              ? 'Rename · double-click enabled'
              : 'Rename · right-click only'
            : undefined,
      })
    },
    [beginActivity, completeActivity, updateSetting],
  )

  const handleToggleDone = useCallback(async (task: Task) => {
    const nextDone = !task.done
    const toastId = beginActivity()

    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? { ...item, done: nextDone } : item,
      ),
    }))

    try {
      const updated = await toggleDone(task.id, nextDone)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
      completeActivity(toastId, nextDone ? 'Task completed' : 'Task reopened', {
        subject: task.title,
        from: nextDone ? 'Open' : 'Completed',
        to: nextDone ? 'Completed' : 'Open',
      })
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, done: task.done } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to update task')
      failActivity(toastId, 'Failed to update task')
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleSetPriority = useCallback(async (task: Task, priority: TaskPriority) => {
    const previous = task.priority ?? 'NONE'
    const toastId = beginActivity()

    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? { ...item, priority } : item,
      ),
    }))

    try {
      const updated = await setPriority(task.id, priority)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
      completeActivity(toastId, 'Priority updated', {
        subject: task.title,
        from: getPriorityOption(previous).label,
        to: getPriorityOption(priority).label,
      })
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, priority: previous } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to update priority')
      failActivity(toastId, 'Failed to update priority')
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleReorder = useCallback(async (tasks: Task[]) => {
    const toastId = beginActivity()
    try {
      const items = buildReorderPayload(tasks)
      const updated = await reorderTasks(items)
      setBoard(updated)
      completeActivity(toastId, 'Task order saved', { detail: 'Drag-and-drop reorder' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save order')
      failActivity(toastId, 'Failed to save order')
      await loadBoard()
    }
  }, [beginActivity, completeActivity, failActivity, loadBoard])

  const handleRenameGroup = useCallback(async (groupId: number, name: string) => {
    const previousName = board.groups.find((group) => group.id === groupId)?.name
    if (previousName === name) {
      return
    }

    const toastId = beginActivity()
    setBoard((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, name } : group)),
    }))

    try {
      const updated = await renameGroup(groupId, name)
      setBoard((current) => ({
        ...current,
        groups: current.groups.map((group) => (group.id === groupId ? updated : group)),
      }))
      completeActivity(toastId, 'Project renamed', {
        from: previousName,
        to: name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename project')
      failActivity(toastId, 'Failed to rename project')
      await loadBoard()
    }
  }, [beginActivity, board.groups, completeActivity, failActivity, loadBoard])

  const handleCreateGroup = useCallback(async (name: string) => {
    const toastId = beginActivity()
    try {
      const created = await createGroup(name)
      setBoard((current) => ({
        ...current,
        groups: [...current.groups, created],
      }))
      setActiveView(created.id)
      completeActivity(toastId, 'Project created', { subject: name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      failActivity(toastId, 'Failed to create project')
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    const groupName = board.groups.find((group) => group.id === groupId)?.name
    const toastId = beginActivity()
    setBoard((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
      tasks: current.tasks.filter((task) => task.groupId !== groupId),
    }))
    setActiveView((current) => (current === groupId ? 'all' : current))

    try {
      await deleteGroup(groupId)
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
      completeActivity(toastId, 'Project deleted', { subject: groupName })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      failActivity(toastId, 'Failed to delete project')
      await loadBoard()
    }
  }, [beginActivity, board.groups, completeActivity, failActivity, loadBoard])

  const handleCreateTask = useCallback(async (groupId: number, insertAtIndex?: number): Promise<Task | null> => {
    const projectName = groupNameFor(board, groupId)
    const toastId = beginActivity()
    try {
      const created = await createTask(DEFAULT_TASK_TITLE, groupId)
      const task = { ...created, comments: [] }
      let nextTasks: Task[] = []

      setBoard((current) => {
        let tasks = [...current.tasks, task]
        if (insertAtIndex != null) {
          tasks = insertTaskInGroup(tasks, task, groupId, insertAtIndex)
        }
        nextTasks = tasks
        return {
          ...current,
          tasks,
          groups: current.groups.map((group) =>
            group.id === groupId ? { ...group, taskCount: group.taskCount + 1 } : group,
          ),
        }
      })

      if (insertAtIndex != null) {
        await reorderTasks(buildReorderPayload(nextTasks))
      }

      completeActivity(toastId, 'Task created', {
        subject: DEFAULT_TASK_TITLE,
        detail: projectName ? `Project · ${projectName}` : undefined,
      })
      return task
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      failActivity(toastId, 'Failed to create task')
      await loadBoard()
      return null
    }
  }, [beginActivity, board, completeActivity, failActivity, loadBoard])

  const handleRenameTask = useCallback(async (task: Task, title: string) => {
    if (title === task.title) {
      return
    }

    const previousTitle = task.title
    const projectName = groupNameFor(board, task.groupId)
    const toastId = beginActivity()
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, title } : item)),
    }))

    try {
      const updated = await updateTaskTitle(task.id, title)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updated.id ? mergeTaskUpdate(item, updated) : item,
        ),
      }))
      completeActivity(toastId, 'Task renamed', {
        from: previousTitle,
        to: title,
        detail: projectName ? `Project · ${projectName}` : undefined,
      })
    } catch (err) {
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, title: task.title } : item,
        ),
      }))
      setError(err instanceof Error ? err.message : 'Failed to rename task')
      failActivity(toastId, 'Failed to rename task')
    }
  }, [beginActivity, board, completeActivity, failActivity])

  const handleAddComment = useCallback(async (task: Task, text: string) => {
    const toastId = beginActivity()
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
      completeActivity(toastId, 'Comment added', {
        subject: task.title,
        detail: truncateActivityText(text),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
      failActivity(toastId, 'Failed to add comment')
      throw err
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleDeleteTask = useCallback(async (task: Task) => {
    const toastId = beginActivity()
    const projectName = groupNameFor(board, task.groupId)
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== task.id),
      groups: current.groups.map((group) =>
        group.id === task.groupId ? { ...group, taskCount: Math.max(0, group.taskCount - 1) } : group,
      ),
    }))

    try {
      await deleteTask(task.id)
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
      completeActivity(toastId, 'Task moved to Recycle Bin', {
        subject: task.title,
        detail: projectName ? `Project · ${projectName}` : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      failActivity(toastId, 'Failed to delete task')
      await loadBoard()
    }
  }, [beginActivity, board, completeActivity, failActivity, loadBoard])

  const handleRestoreTask = useCallback(async (task: Task) => {
    const toastId = beginActivity()
    const projectName = groupNameFor(board, task.groupId)
    setDeletedTasks((current) => current.filter((item) => item.id !== task.id))

    try {
      const restored = await restoreTask(task.id)
      setBoard((current) => ({
        ...current,
        tasks: [...current.tasks, { ...restored, comments: restored.comments ?? [] }],
        groups: current.groups.map((group) =>
          group.id === restored.groupId ? { ...group, taskCount: group.taskCount + 1 } : group,
        ),
      }))
      completeActivity(toastId, 'Task restored', {
        subject: task.title,
        detail: projectName ? `Project · ${projectName}` : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore task')
      failActivity(toastId, 'Failed to restore task')
      await loadBoard()
    }
  }, [beginActivity, board, completeActivity, failActivity, loadBoard])

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
        activityCount={activityEntries.length}
        onSelectView={setActiveView}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 shadow-card">
          {error}
        </div>
      )}

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto" style={{ zoom: zoom / 100 }}>
          {activeView === 'settings' ? (
            <Settings settings={settings} onUpdateSetting={handleUpdateSetting} />
          ) : activeView === 'activity' ? (
            <ActivityLog entries={activityEntries} onClear={clearActivityLog} />
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
              searchQuery={searchQuery}
              priorityFilter={priorityFilter}
              onSearchChange={setSearchQuery}
              onPriorityChange={setPriorityFilter}
              onClearFilters={clearFilters}
            />
          )}
        </div>

        <ZoomControl
          zoom={zoom}
          onZoomChange={setZoom}
          onDecrease={decrease}
          onIncrease={increase}
          onReset={reset}
        />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
