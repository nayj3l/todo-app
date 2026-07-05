import type { AuthMode } from '../types/auth'
import * as apiBoard from './board'
import * as guestBoard from './guestBoard'

let mode: AuthMode = 'google'

export function setBoardApiMode(nextMode: AuthMode, guestId?: string) {
  mode = nextMode
  if (nextMode === 'guest' && guestId) {
    guestBoard.setActiveGuestId(guestId)
  } else {
    guestBoard.setActiveGuestId(null)
  }
}

function pick<T extends (...args: never[]) => unknown>(apiFn: T, guestFn: T): T {
  return ((...args: Parameters<T>) => {
    const fn = mode === 'guest' ? guestFn : apiFn
    return fn(...args)
  }) as T
}

export const getBoard = pick(apiBoard.getBoard, guestBoard.getBoard)
export const getRecycleBin = pick(apiBoard.getRecycleBin, guestBoard.getRecycleBin)
export const reorderTasks = pick(apiBoard.reorderTasks, guestBoard.reorderTasks)
export const reorderGroups = pick(apiBoard.reorderGroups, guestBoard.reorderGroups)
export const toggleDone = pick(apiBoard.toggleDone, guestBoard.toggleDone)
export const setPriority = pick(apiBoard.setPriority, guestBoard.setPriority)
export const createTask = pick(apiBoard.createTask, guestBoard.createTask)
export const updateTaskTitle = pick(apiBoard.updateTaskTitle, guestBoard.updateTaskTitle)
export const renameGroup = pick(apiBoard.renameGroup, guestBoard.renameGroup)
export const createGroup = pick(apiBoard.createGroup, guestBoard.createGroup)
export const updateGroup = pick(apiBoard.updateGroup, guestBoard.updateGroup)
export const deleteGroup = pick(apiBoard.deleteGroup, guestBoard.deleteGroup)
export const addComment = pick(apiBoard.addComment, guestBoard.addComment)
export const updateComment = pick(apiBoard.updateComment, guestBoard.updateComment)
export const deleteComment = pick(apiBoard.deleteComment, guestBoard.deleteComment)
export const deleteTask = pick(apiBoard.deleteTask, guestBoard.deleteTask)
export const restoreTask = pick(apiBoard.restoreTask, guestBoard.restoreTask)
export const clearRecycleBin = pick(apiBoard.clearRecycleBin, guestBoard.clearRecycleBin)
export { mergeTaskUpdate } from './board'
export { initializeGuestData } from './guestBoard'
