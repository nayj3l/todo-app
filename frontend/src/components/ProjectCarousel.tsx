import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TaskGroup } from '../types/board'

function blurFocusedElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

interface ProjectCarouselPeekProps {
  group: TaskGroup
  align: 'left' | 'right'
  onSelect: () => void
}

function ProjectCarouselPeek({ group, align, onSelect }: ProjectCarouselPeekProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-36 w-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-surface-border/50 bg-white/80 px-2 py-3 text-center opacity-45 shadow-card outline-none transition hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 ${
        align === 'left' ? 'mr-auto' : 'ml-auto'
      }`}
      aria-label={`Go to ${group.name}`}
      title={group.name}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="line-clamp-3 text-[10px] font-medium leading-snug text-surface-muted">
        {group.name}
      </span>
      {group.taskCount > 0 && (
        <span className="text-[10px] tabular-nums text-surface-muted/70">{group.taskCount}</span>
      )}
    </button>
  )
}

type SlideDirection = 'from-left' | 'from-right' | 'none'

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

interface ProjectCarouselFrameProps {
  activeGroupId: number
  activeGroupIndex: number
  prevGroup: TaskGroup | null
  nextGroup: TaskGroup | null
  onSelectGroup: (groupId: number) => void
  children: ReactNode
}

export function ProjectCarouselFrame({
  activeGroupId,
  activeGroupIndex,
  prevGroup,
  nextGroup,
  onSelectGroup,
  children,
}: ProjectCarouselFrameProps) {
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('none')
  const prevIndexRef = useRef(activeGroupIndex)

  useEffect(() => {
    const previousIndex = prevIndexRef.current
    if (activeGroupIndex > previousIndex) {
      setSlideDirection('from-right')
    } else if (activeGroupIndex < previousIndex) {
      setSlideDirection('from-left')
    } else {
      setSlideDirection('none')
    }
    prevIndexRef.current = activeGroupIndex
  }, [activeGroupId, activeGroupIndex])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }
      if (event.key === 'ArrowLeft' && prevGroup) {
        event.preventDefault()
        blurFocusedElement()
        onSelectGroup(prevGroup.id)
      }
      if (event.key === 'ArrowRight' && nextGroup) {
        event.preventDefault()
        blurFocusedElement()
        onSelectGroup(nextGroup.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevGroup, nextGroup, onSelectGroup])

  const slideClass =
    slideDirection === 'from-right'
      ? 'project-carousel-slide-from-right'
      : slideDirection === 'from-left'
        ? 'project-carousel-slide-from-left'
        : ''

  return (
    <div className="relative w-full">
      {prevGroup && (
        <div className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
          <ProjectCarouselPeek
            group={prevGroup}
            align="left"
            onSelect={() => onSelectGroup(prevGroup.id)}
          />
        </div>
      )}

      {nextGroup && (
        <div className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
          <ProjectCarouselPeek
            group={nextGroup}
            align="right"
            onSelect={() => onSelectGroup(nextGroup.id)}
          />
        </div>
      )}

      <div className="mx-auto w-full max-w-xl overflow-hidden">
        <div key={activeGroupId} className={slideClass}>
          {children}
        </div>
      </div>
    </div>
  )
}
