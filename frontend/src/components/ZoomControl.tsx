import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '../hooks/useZoom'

interface ZoomControlProps {
  zoom: number
  onZoomChange: (value: number) => void
  onDecrease: () => void
  onIncrease: () => void
  onReset: () => void
}

export default function ZoomControl({
  zoom,
  onZoomChange,
  onDecrease,
  onIncrease,
  onReset,
}: ZoomControlProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-6 z-30 flex items-center"
      aria-label="Zoom controls"
    >
      <div className="pointer-events-auto group flex items-center gap-1 rounded-lg border border-transparent bg-white/50 px-2 py-1 opacity-45 shadow-none backdrop-blur-sm transition-all duration-200 hover:border-surface-border hover:bg-white/95 hover:opacity-100 hover:shadow-card focus-within:border-surface-border focus-within:bg-white/95 focus-within:opacity-100 focus-within:shadow-card">
        <button
          type="button"
          onClick={onDecrease}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-medium text-surface-muted transition group-hover:text-surface-text group-focus-within:text-surface-text hover:bg-[#F3F3F6] disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>

        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          onChange={(event) => onZoomChange(Number.parseInt(event.target.value, 10))}
          aria-label="Zoom level"
          className="zoom-slider h-1 w-24 cursor-pointer appearance-none bg-transparent opacity-70 transition group-hover:opacity-100 group-focus-within:opacity-100"
        />

        <button
          type="button"
          onClick={onIncrease}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-medium text-surface-muted transition group-hover:text-surface-text group-focus-within:text-surface-text hover:bg-[#F3F3F6] disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset to 100%"
          className="min-w-[3rem] rounded px-1 py-0.5 text-xs tabular-nums text-surface-muted/80 transition group-hover:text-surface-muted group-focus-within:text-surface-muted hover:bg-[#F3F3F6] hover:text-surface-text"
        >
          {zoom}%
        </button>
      </div>
    </div>
  )
}
