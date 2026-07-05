import type { TaskPriority } from './priority'
import type { TaskReorderItem } from './board'

export type PendingSyncOperation =
  | { kind: 'toggleDone'; taskId: number; done: boolean }
  | { kind: 'setPriority'; taskId: number; priority: TaskPriority }
  | { kind: 'updateTaskTitle'; taskId: number; title: string }
  | { kind: 'createTask'; title: string; groupId: number }
  | { kind: 'reorderTasks'; items: TaskReorderItem[] }
  | { kind: 'reorderGroups'; groupIds: number[] }
  | { kind: 'renameGroup'; groupId: number; name: string }
  | { kind: 'createGroup'; name: string; color?: string }
  | { kind: 'updateGroup'; groupId: number; name?: string; color?: string }
  | { kind: 'deleteGroup'; groupId: number }
  | { kind: 'addComment'; taskId: number; text: string }
  | { kind: 'updateComment'; taskId: number; commentId: number; text: string }
  | { kind: 'deleteComment'; taskId: number; commentId: number }
  | { kind: 'deleteTask'; taskId: number }
  | { kind: 'restoreTask'; taskId: number }
  | { kind: 'clearRecycleBin' }

export interface PendingSyncItem {
  id: string
  label: string
  operation: PendingSyncOperation
  createdAt: string
  attempts: number
  lastError?: string
}
