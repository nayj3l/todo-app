import type { Task } from '../types/board'
import type { PriorityFilterValue } from '../hooks/useTaskFilters'
import { taskMatchesFilters } from './taskFilters'

export interface GroupTaskSummary {
  total: number
  open: number
  done: number
  visible: number
  progress: number
}

export function summarizeGroupTasks(
  tasks: Task[],
  groupId: number,
  searchQuery: string,
  priorityFilter: PriorityFilterValue,
): GroupTaskSummary {
  const all = tasks.filter((task) => task.groupId === groupId)
  const visible = all.filter((task) => taskMatchesFilters(task, searchQuery, priorityFilter))
  const done = all.filter((task) => task.done).length

  return {
    total: all.length,
    open: all.length - done,
    done,
    visible: visible.length,
    progress: all.length === 0 ? 0 : Math.round((done / all.length) * 100),
  }
}
