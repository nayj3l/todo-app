import type { Board, RecycleBin, Task, TaskComment, TaskGroup } from '../types/board'

const DB_NAME = 'todo-guest-db'
const DB_VERSION = 1
const STORE = 'guest-data'

export interface GuestDataStore {
  groups: TaskGroup[]
  tasks: Task[]
  deletedTasks: Task[]
  nextGroupId: number
  nextTaskId: number
  nextCommentId: number
  bootstrappedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function maxId(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}

export function createStoreFromBootstrap(board: Board, recycleBin: RecycleBin): GuestDataStore {
  const groupIds = board.groups.map((group) => group.id)
  const taskIds = board.tasks.map((task) => task.id)
  const commentIds = board.tasks.flatMap((task) => (task.comments ?? []).map((comment) => comment.id))

  return {
    groups: board.groups.map((group) => ({ ...group })),
    tasks: board.tasks.map((task) => ({
      ...task,
      priority: task.priority ?? 'NONE',
      comments: (task.comments ?? []).map((comment) => ({ ...comment })),
    })),
    deletedTasks: recycleBin.tasks.map((task) => ({
      ...task,
      priority: task.priority ?? 'NONE',
      comments: (task.comments ?? []).map((comment) => ({ ...comment })),
    })),
    nextGroupId: maxId(groupIds) + 1,
    nextTaskId: maxId(taskIds) + 1,
    nextCommentId: maxId(commentIds) + 1,
    bootstrappedAt: new Date().toISOString(),
  }
}

export async function loadGuestStore(guestId: string): Promise<GuestDataStore | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(guestId)
    request.onsuccess = () => resolve((request.result as GuestDataStore | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('Failed to read guest data'))
    tx.oncomplete = () => db.close()
  })
}

export async function saveGuestStore(guestId: string, store: GuestDataStore): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(store, guestId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save guest data'))
  })
}

export async function deleteGuestStore(guestId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(guestId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete guest data'))
  })
}

export function recalcGroupCounts(store: GuestDataStore): void {
  store.groups = store.groups.map((group) => ({
    ...group,
    taskCount: store.tasks.filter((task) => task.groupId === group.id && !task.deletedAt).length,
  }))
}

export function boardFromStore(store: GuestDataStore): Board {
  return {
    groups: store.groups
      .map((group) => ({ ...group }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    tasks: store.tasks.filter((task) => !task.deletedAt).map((task) => ({ ...task })),
  }
}

export function recycleFromStore(store: GuestDataStore): RecycleBin {
  return {
    tasks: store.deletedTasks.map((task) => ({ ...task })),
  }
}

export function findTask(store: GuestDataStore, taskId: number): Task | undefined {
  return store.tasks.find((task) => task.id === taskId) ?? store.deletedTasks.find((task) => task.id === taskId)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export type { TaskComment }
