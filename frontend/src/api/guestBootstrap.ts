import type { Board, RecycleBin } from '../types/board'

export async function fetchGuestBootstrap(): Promise<{ board: Board; recycleBin: RecycleBin }> {
  const response = await fetch('/api/guest/bootstrap')
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Failed to load guest template' }))
    throw new Error(body.error ?? 'Failed to load guest template')
  }
  const data = await response.json()
  return {
    board: {
      groups: data.board.groups,
      tasks: data.board.tasks.map((task: Board['tasks'][number]) => ({
        ...task,
        priority: task.priority ?? 'NONE',
        comments: task.comments ?? [],
      })),
    },
    recycleBin: {
      tasks: data.recycleBin.tasks.map((task: RecycleBin['tasks'][number]) => ({
        ...task,
        priority: task.priority ?? 'NONE',
        comments: task.comments ?? [],
      })),
    },
  }
}
