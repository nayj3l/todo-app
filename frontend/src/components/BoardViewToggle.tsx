import type { BoardView } from '../types/settings'

interface BoardViewToggleProps {
  boardView: BoardView
  wrapTaskTitles: boolean
  columnsAvailable: boolean
  onBoardViewChange: (view: BoardView) => void
  onWrapTaskTitlesChange: (wrap: boolean) => void
}

function toggleClass(active: boolean) {
  return active
    ? 'bg-[#EDE9FE] text-[#5B3FD6]'
    : 'text-[#9A9AA8] hover:bg-[#FAFAFB] hover:text-[#55556A]'
}

function wrapToggleClass(active: boolean) {
  return active
    ? 'bg-[#EEEEF2] text-[#55556A]'
    : 'text-[#B8B8C3] hover:bg-[#FAFAFB] hover:text-[#9A9AA8]'
}

export default function BoardViewToggle({
  boardView,
  wrapTaskTitles,
  columnsAvailable,
  onBoardViewChange,
  onWrapTaskTitlesChange,
}: BoardViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-white p-1 shadow-card">
      <button
        type="button"
        onClick={() => onBoardViewChange('list')}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${toggleClass(boardView === 'list')}`}
        title="List view"
        aria-label="List view"
        aria-pressed={boardView === 'list'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => columnsAvailable && onBoardViewChange('columns')}
        disabled={!columnsAvailable}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${toggleClass(boardView === 'columns')}`}
        title={columnsAvailable ? 'Column view' : 'Column view (All Projects only)'}
        aria-label="Column view"
        aria-pressed={boardView === 'columns'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="18" rx="1" />
          <rect x="14" y="3" width="7" height="18" rx="1" />
        </svg>
      </button>

      <div className="mx-0.5 h-5 w-px bg-surface-border" aria-hidden="true" />

      <button
        type="button"
        onClick={() => onWrapTaskTitlesChange(!wrapTaskTitles)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${wrapToggleClass(wrapTaskTitles)}`}
        title={wrapTaskTitles ? 'Truncate task titles' : 'Wrap task titles'}
        aria-label={wrapTaskTitles ? 'Truncate task titles' : 'Wrap task titles'}
        aria-pressed={wrapTaskTitles}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {wrapTaskTitles ? (
            <>
              <path d="M4 7h16M4 12h11M4 17h16" />
            </>
          ) : (
            <path d="M4 12h16" />
          )}
        </svg>
      </button>
    </div>
  )
}
