import type { PendingSyncItem, PendingSyncOperation } from '../types/pendingSync'

function referencesTask(operation: PendingSyncOperation, taskId: number): boolean {
  switch (operation.kind) {
    case 'toggleDone':
    case 'setPriority':
    case 'updateTaskTitle':
    case 'deleteTask':
    case 'restoreTask':
    case 'addComment':
      return operation.taskId === taskId
    case 'updateComment':
    case 'deleteComment':
      return operation.taskId === taskId
    default:
      return false
  }
}

/** Drop stale queue entries superseded by a newer pending operation. */
export function coalescePendingQueue(
  queue: PendingSyncItem[],
  operation: PendingSyncOperation,
): PendingSyncItem[] {
  let next = [...queue]

  if (operation.kind === 'deleteTask') {
    next = next.filter((item) => !referencesTask(item.operation, operation.taskId))
  }

  if (operation.kind === 'deleteGroup') {
    next = next.filter((item) => {
      if (item.operation.kind === 'renameGroup' && item.operation.groupId === operation.groupId) {
        return false
      }
      if (item.operation.kind === 'updateGroup' && item.operation.groupId === operation.groupId) {
        return false
      }
      if (item.operation.kind === 'deleteGroup' && item.operation.groupId === operation.groupId) {
        return false
      }
      return true
    })
  }

  const replaceLast = (predicate: (item: PendingSyncItem) => boolean) => {
    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (predicate(next[index])) {
        next.splice(index, 1)
        break
      }
    }
  }

  switch (operation.kind) {
    case 'toggleDone':
      replaceLast((item) => item.operation.kind === 'toggleDone' && item.operation.taskId === operation.taskId)
      break
    case 'setPriority':
      replaceLast((item) => item.operation.kind === 'setPriority' && item.operation.taskId === operation.taskId)
      break
    case 'updateTaskTitle':
      replaceLast(
        (item) => item.operation.kind === 'updateTaskTitle' && item.operation.taskId === operation.taskId,
      )
      break
    case 'reorderTasks':
      replaceLast((item) => item.operation.kind === 'reorderTasks')
      break
    case 'reorderGroups':
      replaceLast((item) => item.operation.kind === 'reorderGroups')
      break
    case 'renameGroup':
      replaceLast((item) => item.operation.kind === 'renameGroup' && item.operation.groupId === operation.groupId)
      break
    case 'updateGroup':
      replaceLast((item) => item.operation.kind === 'updateGroup' && item.operation.groupId === operation.groupId)
      break
    default:
      break
  }

  return next
}

export function isBenignPendingSyncError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('already deleted') ||
    message.includes('not in recycle bin')
  )
}
