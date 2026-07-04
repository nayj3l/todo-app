import type { PriorityFilterValue } from '../hooks/useTaskFilters'
import PriorityFilterDropdown from './PriorityFilterDropdown'

interface TaskSearchBarProps {
  searchQuery: string
  priorityFilter: PriorityFilterValue
  onSearchChange: (value: string) => void
  onPriorityChange: (value: PriorityFilterValue) => void
  onClear: () => void
  isActive: boolean
  visibleCount?: number
  totalCount?: number
}

export default function TaskSearchBar({
  searchQuery,
  priorityFilter,
  onSearchChange,
  onPriorityChange,
  onClear,
  isActive,
  visibleCount,
  totalCount,
}: TaskSearchBarProps) {
  return (
    <div>
      <div className="relative flex h-[52px] items-center overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            className="h-full w-full border-0 bg-transparent pl-11 pr-4 text-sm leading-none text-surface-text outline-none placeholder:text-surface-muted"
          />
        </div>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-surface-border" aria-hidden="true" />

        <PriorityFilterDropdown value={priorityFilter} onChange={onPriorityChange} />
      </div>

      {isActive && (
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <span className="text-xs text-surface-muted">
            {visibleCount != null && totalCount != null
              ? `${visibleCount} of ${totalCount} task${totalCount === 1 ? '' : 's'}`
              : 'Filters applied'}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
