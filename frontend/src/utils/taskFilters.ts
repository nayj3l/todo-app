import type { Task } from '../types/board'
import type { PriorityFilterValue } from '../hooks/useTaskFilters'

export function taskMatchesFilters(
  task: Task,
  searchQuery: string,
  priorityFilter: PriorityFilterValue,
): boolean {
  const matchesPriority =
    priorityFilter === 'ALL' || (task.priority ?? 'NONE') === priorityFilter

  const query = searchQuery.trim().toLowerCase()
  if (!query) {
    return matchesPriority
  }

  return matchesPriority && task.title.toLowerCase().includes(query)
}

export function isFilterActive(searchQuery: string, priorityFilter: PriorityFilterValue): boolean {
  return searchQuery.trim().length > 0 || priorityFilter !== 'ALL'
}
