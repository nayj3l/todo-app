import type { Board, RecycleBin, Task, TaskComment, TaskGroup, TaskReorderItem } from '../types/board'
import type { TaskPriority } from '../types/priority'

async function handleResponse<T>(response: Response): Promise<T> {
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
  const response = await fetch('/api/board')
  const board = await handleResponse<Board>(response)
  return {
    ...board,
    tasks: board.tasks.map(normalizeTask),
  }
}

export async function getRecycleBin(): Promise<RecycleBin> {
  const response = await fetch('/api/recycle-bin')
  const data = await handleResponse<RecycleBin>(response)
  return {
    tasks: data.tasks.map(normalizeTask),
  }
}

export async function reorderTasks(items: TaskReorderItem[]): Promise<Board> {
  const response = await fetch('/api/board/reorder', {
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

export async function toggleDone(id: number, done: boolean): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/done`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function setPriority(id: number, priority: TaskPriority): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function createTask(title: string, groupId: number): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, groupId }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function updateTaskTitle(id: number, title: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return normalizeTask(await handleResponse<Task>(response))
}

export async function renameGroup(id: number, name: string): Promise<TaskGroup> {
  return updateGroup(id, { name })
}

export async function createGroup(name: string, color?: string): Promise<TaskGroup> {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  return handleResponse<TaskGroup>(response)
}

export async function updateGroup(
  id: number,
  updates: { name?: string; color?: string },
): Promise<TaskGroup> {
  const response = await fetch(`/api/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return handleResponse<TaskGroup>(response)
}

export async function deleteGroup(id: number): Promise<void> {
  await handleResponse<void>(
    await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
    }),
  )
}

export async function addComment(taskId: number, text: string): Promise<TaskComment> {
  const response = await fetch(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return handleResponse<TaskComment>(response)
}

export async function deleteTask(id: number): Promise<void> {
  await handleResponse<void>(
    await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
  )
}

export async function restoreTask(id: number): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/restore`, {
    method: 'POST',
  })
  return normalizeTask(await handleResponse<Task>(response))
}
