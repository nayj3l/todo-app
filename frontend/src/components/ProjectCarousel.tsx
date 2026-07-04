import type { ReactNode } from 'react'
import type { TaskGroup } from '../types/board'

interface ProjectCarouselPeekProps {
  group: TaskGroup
  side: 'left' | 'right'
  onSelect: () => void
}

export default function ProjectCarouselPeek({ group, side, onSelect }: ProjectCarouselPeekProps) {
  const isLeft = side === 'left'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/peek relative hidden w-[4.5rem] shrink-0 self-stretch overflow-hidden rounded-2xl border border-surface-border/40 bg-white/70 opacity-40 shadow-card transition duration-300 hover:opacity-60 sm:block ${
        isLeft ? 'mr-1' : 'ml-1'
      }`}
      aria-label={`Go to ${group.name}`}
      title={group.name}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLeft
            ? 'bg-gradient-to-r from-white/20 via-white/60 to-white'
            : 'bg-gradient-to-l from-white/20 via-white/60 to-white'
        }`}
      />
      <div className="relative flex h-full flex-col items-center gap-3 px-2 py-10">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        <span
          className={`max-h-56 truncate text-[11px] font-medium leading-tight text-surface-muted ${
            isLeft ? '[writing-mode:vertical-rl]' : '[writing-mode:vertical-lr]'
          }`}
        >
          {group.name}
        </span>
        {group.taskCount > 0 && (
          <span className="text-[10px] tabular-nums text-surface-muted/80">{group.taskCount}</span>
        )}
      </div>
    </button>
  )
}

interface ProjectCarouselFrameProps {
  prevGroup: TaskGroup | null
  nextGroup: TaskGroup | null
  onSelectGroup: (groupId: number) => void
  children: ReactNode
}

export function ProjectCarouselFrame({
  prevGroup,
  nextGroup,
  onSelectGroup,
  children,
}: ProjectCarouselFrameProps) {
  return (
    <div className="mx-auto flex max-w-3xl items-stretch justify-center">
      {nextGroup && (
        <ProjectCarouselPeek
          group={nextGroup}
          side="left"
          onSelect={() => onSelectGroup(nextGroup.id)}
        />
      )}

      <div className="min-w-0 flex-1 max-w-xl">{children}</div>

      {prevGroup && (
        <ProjectCarouselPeek
          group={prevGroup}
          side="right"
          onSelect={() => onSelectGroup(prevGroup.id)}
        />
      )}
    </div>
  )
}
