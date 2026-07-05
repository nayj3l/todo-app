import type { Board, RecycleBin, Task, TaskComment, TaskGroup, TaskReorderItem } from '../types/board'
import type { TaskPriority } from '../types/priority'
import type { PendingSyncOperation } from '../types/pendingSync'
import { withResilientSync } from '../lib/resilientApi'
import { apiFetch } from './client'

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new Error('401: Authentication required')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error ?? 'Request failed')
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    priority: task.priority ?? 'NONE',
    comments: task.comments ?? [],
  }
}

export function mergeTaskUpdate(existing: Task, updated: Task): Task {
  const normalized = normalizeTask(updated)
  const comments = normalized.comments ?? []
  if (comments.length > 0) {
    return normalized
  }
  return { ...normalized, comments: existing.comments ?? [] }
}

export async function getBoard(): Promise<Board> {
  const response = await apiFetch('/api/board')
  const board = await handleResponse<Board>(response)
  return {
    ...board,
    tasks: board.tasks.map(normalizeTask),
  }
}

export async function getRecycleBin(): Promise<RecycleBin> {
  const response = await apiFetch('/api/recycle-bin')
  const data = await handleResponse<RecycleBin>(response)
  return {
    tasks: data.tasks.map(normalizeTask),
  }
}

async function reorderTasksDirect(items: TaskReorderItem[]): Promise<Board> {
  const response = await apiFetch('/api/board/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  const board = await handleResponse<Board>(response)
  return {
    ...board,
    tasks: board.tasks.map(normalizeTask),
  }
}

export async function reorderTasks(items: TaskReorderItem[]): Promise<Board> {
  return withResilientSync('Reorder tasks', { kind: 'reorderTasks', items }, () =>
    reorderTasksDirect(items),
  )
}

async function reorderGroupsDirect(groupIds: number[]): Promise<Board> {
  const response = await apiFetch('/api/groups/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupIds }),
  })
  const board = await handleResponse<Board>(response)
  return {
    ...board,
    tasks: board.tasks.map(normalizeTask),
  }
}

export async function reorderGroups(groupIds: number[]): Promise<Board> {
  return withResilientSync('Reorder projects', { kind: 'reorderGroups', groupIds }, () =>
    reorderGroupsDirect(groupIds),
  )
}

async function toggleDoneDirect(id: number, done: boolean): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${id}/done`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function toggleDone(id: number, done: boolean): Promise<Task> {
  return withResilientSync(
    done ? 'Complete task' : 'Reopen task',
    { kind: 'toggleDone', taskId: id, done },
    () => toggleDoneDirect(id, done),
  )
}

async function setPriorityDirect(id: number, priority: TaskPriority): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${id}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function setPriority(id: number, priority: TaskPriority): Promise<Task> {
  return withResilientSync('Update priority', { kind: 'setPriority', taskId: id, priority }, () =>
    setPriorityDirect(id, priority),
  )
}

async function createTaskDirect(title: string, groupId: number): Promise<Task> {
  const response = await apiFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, groupId }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function createTask(title: string, groupId: number): Promise<Task> {
  return withResilientSync('Create task', { kind: 'createTask', title, groupId }, () =>
    createTaskDirect(title, groupId),
  )
}

async function updateTaskTitleDirect(id: number, title: string): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function updateTaskTitle(id: number, title: string): Promise<Task> {
  return withResilientSync('Rename task', { kind: 'updateTaskTitle', taskId: id, title }, () =>
    updateTaskTitleDirect(id, title),
  )
}

export async function renameGroup(id: number, name: string): Promise<TaskGroup> {
  return updateGroup(id, { name })
}

async function createGroupDirect(name: string, color?: string): Promise<TaskGroup> {
  const response = await apiFetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  return handleResponse<TaskGroup>(response)
}

export async function createGroup(name: string, color?: string): Promise<TaskGroup> {
  return withResilientSync('Create project', { kind: 'createGroup', name, color }, () =>
    createGroupDirect(name, color),
  )
}

async function updateGroupDirect(
  id: number,
  updates: { name?: string; color?: string },
): Promise<TaskGroup> {
  const response = await apiFetch(`/api/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return handleResponse<TaskGroup>(response)
}

export async function updateGroup(
  id: number,
  updates: { name?: string; color?: string },
): Promise<TaskGroup> {
  const label = updates.name ? 'Rename project' : 'Update project'
  return withResilientSync(label, { kind: 'updateGroup', groupId: id, ...updates }, () =>
    updateGroupDirect(id, updates),
  )
}

async function deleteGroupDirect(id: number): Promise<void> {
  await handleResponse<void>(
    await apiFetch(`/api/groups/${id}`, {
      method: 'DELETE',
    }),
  )
}

export async function deleteGroup(id: number): Promise<void> {
  return withResilientSync('Delete project', { kind: 'deleteGroup', groupId: id }, () =>
    deleteGroupDirect(id),
  )
}

async function addCommentDirect(taskId: number, text: string): Promise<TaskComment> {
  const response = await apiFetch(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return handleResponse<TaskComment>(response)
}

export async function addComment(taskId: number, text: string): Promise<TaskComment> {
  return withResilientSync('Add comment', { kind: 'addComment', taskId, text }, () =>
    addCommentDirect(taskId, text),
  )
}

async function updateCommentDirect(
  taskId: number,
  commentId: number,
  text: string,
): Promise<TaskComment> {
  const response = await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return handleResponse<TaskComment>(response)
}

export async function updateComment(
  taskId: number,
  commentId: number,
  text: string,
): Promise<TaskComment> {
  return withResilientSync('Update comment', { kind: 'updateComment', taskId, commentId, text }, () =>
    updateCommentDirect(taskId, commentId, text),
  )
}

async function deleteCommentDirect(taskId: number, commentId: number): Promise<void> {
  await handleResponse<void>(
    await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
  )
}

export async function deleteComment(taskId: number, commentId: number): Promise<void> {
  return withResilientSync('Delete comment', { kind: 'deleteComment', taskId, commentId }, () =>
    deleteCommentDirect(taskId, commentId),
  )
}

async function deleteTaskDirect(id: number): Promise<void> {
  await handleResponse<void>(
    await apiFetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
  )
}

export async function deleteTask(id: number): Promise<void> {
  return withResilientSync('Delete task', { kind: 'deleteTask', taskId: id }, () =>
    deleteTaskDirect(id),
  )
}

async function restoreTaskDirect(id: number): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${id}/restore`, {
    method: 'POST',
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function restoreTask(id: number): Promise<Task> {
  return withResilientSync('Restore task', { kind: 'restoreTask', taskId: id }, () =>
    restoreTaskDirect(id),
  )
}

export async function runPendingOperation(operation: PendingSyncOperation): Promise<void> {
  switch (operation.kind) {
    case 'toggleDone':
      await toggleDoneDirect(operation.taskId, operation.done)
      return
    case 'setPriority':
      await setPriorityDirect(operation.taskId, operation.priority)
      return
    case 'updateTaskTitle':
      await updateTaskTitleDirect(operation.taskId, operation.title)
      return
    case 'createTask':
      await createTaskDirect(operation.title, operation.groupId)
      return
    case 'reorderTasks':
      await reorderTasksDirect(operation.items)
      return
    case 'reorderGroups':
      await reorderGroupsDirect(operation.groupIds)
      return
    case 'renameGroup':
      await updateGroupDirect(operation.groupId, { name: operation.name })
      return
    case 'createGroup':
      await createGroupDirect(operation.name, operation.color)
      return
    case 'updateGroup':
      await updateGroupDirect(operation.groupId, {
        name: operation.name,
        color: operation.color,
      })
      return
    case 'deleteGroup':
      await deleteGroupDirect(operation.groupId)
      return
    case 'addComment':
      await addCommentDirect(operation.taskId, operation.text)
      return
    case 'updateComment':
      await updateCommentDirect(operation.taskId, operation.commentId, operation.text)
      return
    case 'deleteComment':
      await deleteCommentDirect(operation.taskId, operation.commentId)
      return
    case 'deleteTask':
      await deleteTaskDirect(operation.taskId)
      return
    case 'restoreTask':
      await restoreTaskDirect(operation.taskId)
      return
    default:
      throw new Error('Unknown pending operation')
  }
}
