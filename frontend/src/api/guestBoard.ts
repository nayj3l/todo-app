import type { Board, RecycleBin, Task, TaskComment, TaskGroup, TaskReorderItem } from '../types/board'
import type { TaskPriority } from '../types/priority'
import {
  boardFromStore,
  createStoreFromBootstrap,
  findTask,
  loadGuestStore,
  nowIso,
  recalcGroupCounts,
  recycleFromStore,
  saveGuestStore,
  type GuestDataStore,
} from '../lib/guestDb'
import { fetchGuestBootstrap } from './guestBootstrap'
import { RECYCLE_BIN_LIMIT } from '../constants/recycleBin'
export { mergeTaskUpdate } from './board'

let activeGuestId: string | null = null

export function setActiveGuestId(guestId: string | null) {
  activeGuestId = guestId
}

async function withStore<T>(fn: (store: GuestDataStore) => T | Promise<T>): Promise<T> {
  if (!activeGuestId) {
    throw new Error('Guest session is not active')
  }
  const store = await loadGuestStore(activeGuestId)
  if (!store) {
    throw new Error('Guest data not found in this browser')
  }
  const result = await fn(store)
  recalcGroupCounts(store)
  await saveGuestStore(activeGuestId, store)
  return result
}

function trimRecycleBin(store: GuestDataStore) {
  if (store.deletedTasks.length > RECYCLE_BIN_LIMIT) {
    store.deletedTasks = store.deletedTasks.slice(0, RECYCLE_BIN_LIMIT)
  }
}

export async function initializeGuestData(guestId: string, forceBootstrap = false): Promise<void> {
  activeGuestId = guestId
  const existing = await loadGuestStore(guestId)
  if (existing && !forceBootstrap) {
    return
  }
  const { board, recycleBin } = await fetchGuestBootstrap()
  const store = createStoreFromBootstrap(board, recycleBin)
  await saveGuestStore(guestId, store)
}

export async function getBoard(): Promise<Board> {
  return withStore((store) => boardFromStore(store))
}

export async function getRecycleBin(): Promise<RecycleBin> {
  return withStore((store) => recycleFromStore(store))
}

export async function clearRecycleBin(): Promise<void> {
  await withStore((store) => {
    store.deletedTasks = []
  })
}

export async function reorderTasks(items: TaskReorderItem[]): Promise<Board> {
  return withStore((store) => {
    for (const item of items) {
      const task = store.tasks.find((entry) => entry.id === item.taskId)
      if (!task) {
        continue
      }
      task.groupId = item.groupId
      task.sortOrder = item.sortOrder
      task.updatedAt = nowIso()
    }
    return boardFromStore(store)
  })
}

export async function toggleDone(id: number, done: boolean): Promise<Task> {
  return withStore((store) => {
    const task = store.tasks.find((entry) => entry.id === id)
    if (!task) {
      throw new Error('Task not found')
    }
    task.done = done
    task.updatedAt = nowIso()
    return { ...task }
  })
}

export async function setPriority(id: number, priority: TaskPriority): Promise<Task> {
  return withStore((store) => {
    const task = store.tasks.find((entry) => entry.id === id)
    if (!task) {
      throw new Error('Task not found')
    }
    task.priority = priority
    task.updatedAt = nowIso()
    return { ...task }
  })
}

export async function createTask(title: string, groupId: number): Promise<Task> {
  return withStore((store) => {
    const sortOrder = store.tasks.filter((task) => task.groupId === groupId && !task.deletedAt).length
    const task: Task = {
      id: store.nextTaskId++,
      title,
      description: null,
      done: false,
      groupId,
      sortOrder,
      priority: 'NONE',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      comments: [],
    }
    store.tasks.push(task)
    return { ...task }
  })
}

export async function updateTaskTitle(id: number, title: string): Promise<Task> {
  return withStore((store) => {
    const task = store.tasks.find((entry) => entry.id === id)
    if (!task) {
      throw new Error('Task not found')
    }
    task.title = title
    task.updatedAt = nowIso()
    return { ...task }
  })
}

export async function createGroup(name: string, color?: string): Promise<TaskGroup> {
  return withStore((store) => {
    for (const group of store.groups) {
      group.sortOrder += 1
    }
    const colors = ['#8B5CF6', '#3B82F6', '#EF4444', '#F97316', '#14B8A6']
    const group: TaskGroup = {
      id: store.nextGroupId++,
      name,
      color: color ?? colors[0],
      sortOrder: 0,
      taskCount: 0,
    }
    store.groups.unshift(group)
    return { ...group }
  })
}

export async function updateGroup(id: number, updates: { name?: string; color?: string }): Promise<TaskGroup> {
  return withStore((store) => {
    const group = store.groups.find((entry) => entry.id === id)
    if (!group) {
      throw new Error('Board not found')
    }
    if (updates.name != null) {
      group.name = updates.name
    }
    if (updates.color != null) {
      group.color = updates.color
    }
    return { ...group }
  })
}

export async function renameGroup(id: number, name: string): Promise<TaskGroup> {
  return updateGroup(id, { name })
}

export async function deleteGroup(id: number): Promise<void> {
  await withStore((store) => {
    const deletedAt = nowIso()
    for (const task of store.tasks) {
      if (task.groupId === id && !task.deletedAt) {
        task.deletedAt = deletedAt
        store.deletedTasks.unshift({ ...task, deletedAt })
      }
    }
    store.tasks = store.tasks.filter((task) => task.groupId !== id)
    store.groups = store.groups.filter((group) => group.id !== id)
    trimRecycleBin(store)
  })
}

export async function reorderGroups(groupIds: number[]): Promise<Board> {
  return withStore((store) => {
    const groupsById = new Map(store.groups.map((group) => [group.id, group]))
    store.groups = groupIds.map((id, index) => {
      const group = groupsById.get(id)
      if (!group) {
        throw new Error('Board not found')
      }
      return { ...group, sortOrder: index }
    })
    return boardFromStore(store)
  })
}

export async function addComment(taskId: number, text: string): Promise<TaskComment> {
  return withStore((store) => {
    const task = findTask(store, taskId)
    if (!task) {
      throw new Error('Task not found')
    }
    const comment: TaskComment = {
      id: store.nextCommentId++,
      taskId,
      text,
      createdAt: nowIso(),
    }
    task.comments = [...(task.comments ?? []), comment]
    task.updatedAt = nowIso()
    return comment
  })
}

export async function updateComment(taskId: number, commentId: number, text: string): Promise<TaskComment> {
  return withStore((store) => {
    const task = findTask(store, taskId)
    if (!task) {
      throw new Error('Task not found')
    }
    const comment = (task.comments ?? []).find((entry) => entry.id === commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }
    comment.text = text
    task.updatedAt = nowIso()
    return { ...comment }
  })
}

export async function deleteComment(taskId: number, commentId: number): Promise<void> {
  await withStore((store) => {
    const task = findTask(store, taskId)
    if (!task) {
      throw new Error('Task not found')
    }
    task.comments = (task.comments ?? []).filter((comment) => comment.id !== commentId)
    task.updatedAt = nowIso()
  })
}

export async function deleteTask(id: number): Promise<void> {
  await withStore((store) => {
    const index = store.tasks.findIndex((task) => task.id === id)
    if (index === -1) {
      throw new Error('Task not found')
    }
    const task = { ...store.tasks[index], deletedAt: nowIso() }
    store.deletedTasks.unshift(task)
    store.tasks.splice(index, 1)
    trimRecycleBin(store)
  })
}

export async function restoreTask(id: number): Promise<Task> {
  return withStore((store) => {
    const index = store.deletedTasks.findIndex((task) => task.id === id)
    if (index === -1) {
      throw new Error('Task not found in recycle bin')
    }
    const restored = { ...store.deletedTasks[index], deletedAt: null }
    store.deletedTasks.splice(index, 1)
    store.tasks.push(restored)
    return { ...restored }
  })
}
