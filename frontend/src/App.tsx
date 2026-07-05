import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  completeGoogleSignIn,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutGoogle,
  subscribeAuth,
} from './api/auth'
import {
  addComment,
  clearRecycleBin,
  createTask,
  createGroup,
  deleteComment,
  deleteGroup,
  deleteTask,
  getBoard,
  getRecycleBin,
  initializeGuestData,
  mergeTaskUpdate,
  renameGroup,
  reorderGroups,
  reorderTasks,
  restoreTask,
  setBoardApiMode,
  setPriority,
  toggleDone,
  updateComment,
  updateTaskTitle,
} from './api/boardStore'
import { clearGuestSession, createGuestSession, loadGuestSession, saveGuestSession } from './lib/guestSession'
import { deleteGuestStore } from './lib/guestDb'
import PendingSyncPanel from './components/PendingSyncPanel'
import LoginPage from './components/LoginPage'
import RecycleBin from './components/RecycleBin'
import ActivityLog from './components/ActivityLog'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import TaskBoard, { buildReorderPayload, insertTaskInGroup } from './components/TaskBoard'
import ToastContainer from './components/ToastContainer'
import ZoomControl from './components/ZoomControl'
import { usePendingSync } from './hooks/usePendingSync'
import { useActivityNotifications } from './hooks/useActivityNotifications'
import { useTaskFilters } from './hooks/useTaskFilters'
import { useSettings } from './hooks/useSettings'
import { useZoom } from './hooks/useZoom'
import type { ActiveView, Board, Task, TaskGroup } from './types/board'
import type { AuthUser } from './types/auth'
import { getPriorityOption, type TaskPriority } from './types/priority'
import type { AppSettings } from './types/settings'
import { APP_NAME } from './constants/app'
import { DEFAULT_TASK_TITLE, TASK_CREATE_TOAST_DELAY_MS } from './constants/tasks'
import { truncateActivityText } from './utils/activityLog'
import { mutationFailedQueued } from './utils/mutationError'
import { removePendingSyncItem, clearAllPendingSync } from './lib/pendingSyncQueue'

function groupNameFor(board: Board, groupId: number | null | undefined) {
  if (groupId == null) {
    return undefined
  }
  return board.groups.find((group) => group.id === groupId)?.name
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [googleSigningIn, setGoogleSigningIn] = useState(false)
  const [guestSigningIn, setGuestSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [board, setBoard] = useState<Board>({ groups: [], tasks: [] })
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoEditTaskId, setAutoEditTaskId] = useState<number | null>(null)
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
      if (err instanceof Error && err.message.includes('401')) {
        setUser(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [])

  const isSignedInUser = user?.mode === 'google'
  const { items: pendingItems, pendingCount, syncing, flush: flushPendingSync, refresh: refreshPending } =
    usePendingSync(isSignedInUser, loadBoard)

  useEffect(() => {
    let unsubscribeFirebase: (() => void) | undefined

    async function initAuth() {
      setAuthLoading(true)
      setSignInError(null)

      const guest = loadGuestSession()
      if (guest) {
        try {
          await initializeGuestData(guest.guestId)
          setBoardApiMode('guest', guest.guestId)
          setUser({
            id: 0,
            name: guest.nickname,
            email: null,
            pictureUrl: null,
            mode: 'guest',
            guestId: guest.guestId,
          })
        } catch (err) {
          clearGuestSession()
          setSignInError(err instanceof Error ? err.message : 'Failed to restore guest session')
        } finally {
          setAuthLoading(false)
        }
        return
      }

      if (!isFirebaseConfigured) {
        setAuthLoading(false)
        return
      }

      unsubscribeFirebase = subscribeAuth(async (firebaseUser) => {
        setSignInError(null)
        try {
          if (!firebaseUser) {
            setUser(null)
            setBoardApiMode('google')
            setLoading(false)
            return
          }
          setBoardApiMode('google')
          const currentUser = await completeGoogleSignIn()
          setUser(currentUser)
        } catch (err) {
          await signOutGoogle().catch(() => {})
          setSignInError(err instanceof Error ? err.message : 'Failed to sign in')
          setUser(null)
          setLoading(false)
        } finally {
          setAuthLoading(false)
          setGoogleSigningIn(false)
        }
      })
    }

    void initAuth()
    return () => unsubscribeFirebase?.()
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }
    setLoading(true)
    loadBoard()
  }, [user, loadBoard])

  useEffect(() => {
    if (activeView === 'pending' && pendingCount === 0 && !syncing) {
      setActiveView('all')
    }
  }, [activeView, pendingCount, syncing])

  useEffect(() => {
    function blockBrowserContextMenu(event: MouseEvent) {
      event.preventDefault()
    }
    document.addEventListener('contextmenu', blockBrowserContextMenu)
    return () => document.removeEventListener('contextmenu', blockBrowserContextMenu)
  }, [])

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
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
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
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
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
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to save order')
      failActivity(toastId, 'Failed to save order')
      await loadBoard()
    }
  }, [beginActivity, completeActivity, failActivity, loadBoard])

  const handleReorderGroups = useCallback(async (groups: TaskGroup[]) => {
    const toastId = beginActivity()
    try {
      const updated = await reorderGroups(groups.map((group) => group.id))
      setBoard(updated)
      completeActivity(toastId, 'Board order saved', { detail: 'Drag-and-drop reorder' })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to save board order')
      failActivity(toastId, 'Failed to save board order')
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
      completeActivity(toastId, 'Board renamed', {
        from: previousName,
        to: name,
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to rename board')
      failActivity(toastId, 'Failed to rename board')
      await loadBoard()
    }
  }, [beginActivity, board.groups, completeActivity, failActivity, loadBoard])

  const handleCreateGroup = useCallback(async (name: string) => {
    const toastId = beginActivity()
    try {
      const created = await createGroup(name)
      setBoard((current) => ({
        ...current,
        groups: [{ ...created, sortOrder: 0 }, ...current.groups.map((group, index) => ({ ...group, sortOrder: index + 1 }))],
      }))
      setActiveView(created.id)
      completeActivity(toastId, 'Board created', { subject: name })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to create board')
      failActivity(toastId, 'Failed to create board')
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
      completeActivity(toastId, 'Board deleted', { subject: groupName })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to delete board')
      failActivity(toastId, 'Failed to delete board')
      await loadBoard()
    }
  }, [beginActivity, board.groups, completeActivity, failActivity, loadBoard])

  const handleCreateTask = useCallback(async (groupId: number, insertAtIndex?: number): Promise<Task | null> => {
    const boardName = groupNameFor(board, groupId)
    const toastId = beginActivity()
    try {
      const created = await createTask(DEFAULT_TASK_TITLE, groupId)
      const task = { ...created, comments: [] }
      let nextTasks: Task[] = []

      flushSync(() => {
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
        setAutoEditTaskId(task.id)
      })

      if (insertAtIndex != null) {
        await reorderTasks(buildReorderPayload(nextTasks))
      }

      window.setTimeout(() => {
        completeActivity(toastId, 'Task created', {
          subject: DEFAULT_TASK_TITLE,
          detail: boardName ? `Board · ${boardName}` : undefined,
        })
      }, TASK_CREATE_TOAST_DELAY_MS)
      return task
    } catch (err) {
      if (mutationFailedQueued(err)) {
        completeActivity(toastId, 'Saved locally — pending sync', { detail: 'Pending sync' })
        return null
      }
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
    const boardName = groupNameFor(board, task.groupId)
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
        detail: boardName ? `Board · ${boardName}` : undefined,
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
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
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to add comment')
      failActivity(toastId, 'Failed to add comment')
      throw err
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleUpdateComment = useCallback(async (task: Task, commentId: number, text: string) => {
    const toastId = beginActivity()
    try {
      const updated = await updateComment(task.id, commentId, text)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                comments: (item.comments ?? []).map((comment) =>
                  comment.id === commentId ? updated : comment,
                ),
              }
            : item,
        ),
      }))
      completeActivity(toastId, 'Comment updated', {
        subject: task.title,
        detail: truncateActivityText(text),
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to update comment')
      failActivity(toastId, 'Failed to update comment')
      throw err
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleDeleteComment = useCallback(async (task: Task, commentId: number) => {
    const toastId = beginActivity()
    try {
      await deleteComment(task.id, commentId)
      setBoard((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id
            ? { ...item, comments: (item.comments ?? []).filter((comment) => comment.id !== commentId) }
            : item,
        ),
      }))
      completeActivity(toastId, 'Comment deleted', { subject: task.title })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
      failActivity(toastId, 'Failed to delete comment')
      throw err
    }
  }, [beginActivity, completeActivity, failActivity])

  const handleDeleteTask = useCallback(async (task: Task) => {
    const toastId = beginActivity()
    const boardName = groupNameFor(board, task.groupId)
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
        detail: boardName ? `Board · ${boardName}` : undefined,
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      failActivity(toastId, 'Failed to delete task')
      await loadBoard()
    }
  }, [beginActivity, board, completeActivity, failActivity, loadBoard])

  const handleBulkDeleteTasks = useCallback(async (tasksToDelete: Task[]) => {
    if (tasksToDelete.length === 0) {
      return
    }
    const ids = new Set(tasksToDelete.map((task) => task.id))
    const toastId = beginActivity()
    setBoard((current) => {
      const removedByGroup = new Map<number, number>()
      tasksToDelete.forEach((task) => {
        if (task.groupId != null) {
          removedByGroup.set(task.groupId, (removedByGroup.get(task.groupId) ?? 0) + 1)
        }
      })
      return {
        ...current,
        tasks: current.tasks.filter((task) => !ids.has(task.id)),
        groups: current.groups.map((group) => {
          const removed = removedByGroup.get(group.id) ?? 0
          return removed > 0
            ? { ...group, taskCount: Math.max(0, group.taskCount - removed) }
            : group
        }),
      }
    })

    try {
      for (const task of tasksToDelete) {
        await deleteTask(task.id)
      }
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
      const count = tasksToDelete.length
      completeActivity(toastId, `${count} task${count === 1 ? '' : 's'} moved to Recycle Bin`)
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to delete tasks')
      failActivity(toastId, 'Failed to delete tasks')
      await loadBoard()
    }
  }, [beginActivity, completeActivity, failActivity, loadBoard])

  const handleClearRecycleBin = useCallback(async () => {
    const count = deletedTasks.length
    const toastId = beginActivity()
    setDeletedTasks([])
    try {
      await clearRecycleBin()
      completeActivity(toastId, 'Recycle bin cleared', {
        detail: count > 0 ? `${count} task${count === 1 ? '' : 's'} permanently removed` : undefined,
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to clear recycle bin')
      failActivity(toastId, 'Failed to clear recycle bin')
      const recycleData = await getRecycleBin()
      setDeletedTasks(recycleData.tasks)
    }
  }, [beginActivity, completeActivity, deletedTasks.length, failActivity])

  const handleClearPendingSync = useCallback(() => {
    clearAllPendingSync()
    refreshPending()
  }, [refreshPending])

  const handleRestoreTask = useCallback(async (task: Task) => {
    const toastId = beginActivity()
    const boardName = groupNameFor(board, task.groupId)
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
        detail: boardName ? `Board · ${boardName}` : undefined,
      })
    } catch (err) {
      if (mutationFailedQueued(err)) {
        dismissToast(toastId)
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to restore task')
      failActivity(toastId, 'Failed to restore task')
      await loadBoard()
    }
  }, [beginActivity, board, completeActivity, failActivity, loadBoard])

  const handleSignIn = useCallback(async () => {
    setGoogleSigningIn(true)
    setSignInError(null)
    try {
      await signInWithGoogle()
      const currentUser = await completeGoogleSignIn()
      setBoardApiMode('google')
      setUser(currentUser)
    } catch (err) {
      await signOutGoogle().catch(() => {})
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      if (message.includes('api-key-not-valid')) {
        setSignInError(
          'Invalid Firebase API key. In Firebase Console → Project settings → Your apps, open the web app and copy the full firebaseConfig block into frontend/.env.local (do not edit characters by hand). Stop and restart npm run dev, then hard-refresh the browser.',
        )
      } else if (message.includes('popup-closed-by-user')) {
        setSignInError('Sign-in cancelled.')
      } else {
        setSignInError(message)
      }
    } finally {
      setGoogleSigningIn(false)
    }
  }, [])

  const handleGuestSignIn = useCallback(async (nickname: string) => {
    setGuestSigningIn(true)
    setSignInError(null)
    try {
      const session = createGuestSession(nickname)
      saveGuestSession(session)
      await initializeGuestData(session.guestId, true)
      setBoardApiMode('guest', session.guestId)
      setUser({
        id: 0,
        name: session.nickname,
        email: null,
        pictureUrl: null,
        mode: 'guest',
        guestId: session.guestId,
      })
    } catch (err) {
      clearGuestSession()
      setSignInError(err instanceof Error ? err.message : 'Failed to start guest session')
    } finally {
      setGuestSigningIn(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      if (user?.mode === 'guest' && user.guestId) {
        clearGuestSession()
        await deleteGuestStore(user.guestId)
        setBoardApiMode('google')
      } else {
        await signOutGoogle()
      }
      setUser(null)
      setBoard({ groups: [], tasks: [] })
      setDeletedTasks([])
      setActiveView('all')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-surface-muted">
        Checking sign-in...
      </div>
    )
  }

  if (!user) {
    return (
      <LoginPage
        onGoogleSignIn={handleSignIn}
        onGuestSignIn={handleGuestSignIn}
        googleSigningIn={googleSigningIn}
        guestSigningIn={guestSigningIn}
        error={signInError}
        googleEnabled={isFirebaseConfigured}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-surface-muted">
        Loading {APP_NAME}...
      </div>
    )
  }

  const boardScale = zoom / 100
  const isColumnKanban = settings.boardView === 'columns' && activeView === 'all'
  const boardScaleStyle =
    boardScale === 1
      ? undefined
      : isColumnKanban
        ? {
            transform: `scale(${boardScale})`,
            transformOrigin: 'top left',
            width: `${100 / boardScale}%`,
            height: `${100 / boardScale}%`,
          }
        : { zoom: boardScale }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">
      <Sidebar
        groups={board.groups}
        activeView={activeView}
        totalOpen={openCount}
        recycleCount={deletedTasks.length}
        activityCount={activityEntries.length}
        pendingCount={pendingCount}
        showPendingSync={isSignedInUser && (pendingCount > 0 || syncing)}
        pendingSyncing={syncing}
        onViewPendingSync={() => setActiveView('pending')}
        onSyncPending={() => void flushPendingSync()}
        user={user}
        onSelectView={setActiveView}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onSignOut={handleSignOut}
      />

      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 shadow-card">
          {error}
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {user.mode === 'guest' && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-900">
            Guest mode — changes are stored in this browser only (IndexedDB). Sign in with Google to sync across devices.
          </div>
        )}

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            settings.boardView === 'columns' && activeView === 'all'
              ? 'overflow-hidden'
              : 'overflow-y-auto'
          }`}
          style={boardScaleStyle}
        >
          {activeView === 'settings' ? (
            <Settings settings={settings} onUpdateSetting={handleUpdateSetting} />
          ) : activeView === 'activity' ? (
            <ActivityLog entries={activityEntries} onClear={clearActivityLog} />
          ) : activeView === 'pending' ? (
            <PendingSyncPanel
              items={pendingItems}
              syncing={syncing}
              onSyncNow={() => void flushPendingSync()}
              onDismiss={(id) => {
                removePendingSyncItem(id)
                refreshPending()
              }}
              onClearAll={handleClearPendingSync}
            />
          ) : activeView === 'recycle' ? (
            <RecycleBin
              tasks={deletedTasks}
              groups={board.groups}
              onRestore={handleRestoreTask}
              onClearAll={handleClearRecycleBin}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
            <TaskBoard
              groups={board.groups}
              tasks={groupedTasks}
              activeGroupId={activeView === 'all' ? 'all' : activeView}
              doubleClickRename={settings.doubleClickRename}
              showProjectTaskBreakdown={settings.showProjectTaskBreakdown}
              showProjectProgressBar={settings.showProjectProgressBar}
              onToggleDone={handleToggleDone}
              onSetPriority={handleSetPriority}
              onReorder={handleReorder}
              onReorderGroups={handleReorderGroups}
              onRenameGroup={handleRenameGroup}
              onRenameTask={handleRenameTask}
              onCreateTask={handleCreateTask}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onDeleteTask={handleDeleteTask}
              onDeleteTasks={handleBulkDeleteTasks}
              onDeleteGroup={handleDeleteGroup}
              onSelectGroup={setActiveView}
              searchQuery={searchQuery}
              priorityFilter={priorityFilter}
              onSearchChange={setSearchQuery}
              onPriorityChange={setPriorityFilter}
              onClearFilters={clearFilters}
              boardView={settings.boardView}
              wrapTaskTitles={settings.wrapTaskTitles}
              boardZoom={boardScale}
              autoEditTaskId={autoEditTaskId}
              onAutoEditConsumed={() => setAutoEditTaskId(null)}
              onBoardViewChange={(view) => handleUpdateSetting('boardView', view)}
              onWrapTaskTitlesChange={(wrap) => handleUpdateSetting('wrapTaskTitles', wrap)}
            />
            </div>
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
