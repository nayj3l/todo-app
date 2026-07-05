import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { TaskGroup } from '../types/board'

export interface GroupDragHandleProps {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners | undefined
}

interface SortableGroupSectionProps {
  group: TaskGroup
  className: string
  dragWithOverlay: boolean
  children: (props: { dragHandle: GroupDragHandleProps; isDragging: boolean }) => ReactNode
}

export default function SortableGroupSection({
  group,
  className,
  dragWithOverlay,
  children,
}: SortableGroupSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column-${group.id}`,
    data: { type: 'column', groupId: group.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging && dragWithOverlay ? 'opacity-0' : ''}`}
    >
      {children({ dragHandle: { attributes, listeners }, isDragging })}
    </section>
  )
}
