import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TaskGroup } from '../types/board'

function blurFocusedElement() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
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
    <div className="mx-auto w-full max-w-xl overflow-visible">
      <div key={activeGroupId} className={slideClass}>
        {children}
      </div>
    </div>
  )
}
