import { useCallback, useState } from 'react'
import type { TaskPriority } from '../types/priority'

export type PriorityFilterValue = TaskPriority | 'ALL'

const PRIORITY_STORAGE_KEY = 'todo-app-priority-filter'

function loadPriorityFilter(): PriorityFilterValue {
  try {
    const raw = localStorage.getItem(PRIORITY_STORAGE_KEY)
    if (!raw) {
      return 'ALL'
    }
    if (raw.startsWith('[')) {
      return 'ALL'
    }
    if (raw === 'ALL') {
      return 'ALL'
    }
    return raw as TaskPriority
  } catch {
    return 'ALL'
  }
}

function savePriorityFilter(value: PriorityFilterValue) {
  localStorage.setItem(PRIORITY_STORAGE_KEY, value)
}

export function useTaskFilters() {
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilterState] = useState<PriorityFilterValue>(loadPriorityFilter)

  const setPriorityFilter = useCallback((value: PriorityFilterValue) => {
    setPriorityFilterState(value)
    savePriorityFilter(value)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setPriorityFilter('ALL')
  }, [setPriorityFilter])

  const isActive = searchQuery.trim().length > 0 || priorityFilter !== 'ALL'

  return {
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    clearFilters,
    isActive,
  }
}
