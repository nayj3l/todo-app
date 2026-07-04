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
      <div className="relative flex items-stretch overflow-hidden rounded-xl border border-surface-border bg-white shadow-card transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted"
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
            className="w-full border-0 bg-transparent py-2.5 pl-10 pr-3 text-sm text-surface-text outline-none placeholder:text-surface-muted"
          />
        </div>

        <div className="w-px shrink-0 self-stretch bg-surface-border" aria-hidden="true" />

        <PriorityFilterDropdown value={priorityFilter} onChange={onPriorityChange} />
      </div>

      {isActive && (
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-surface-muted">
            {visibleCount != null && totalCount != null
              ? `${visibleCount} of ${totalCount} tasks`
              : 'Filters applied'}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-brand-600 transition hover:text-brand-700"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
