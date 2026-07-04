import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Task, TaskGroup } from '../types/board'
import type { TaskPriority } from '../types/priority'
import AddCardButton from './AddCardButton'
import GroupHeader from './GroupHeader'
import { ProjectCarouselFrame } from './ProjectCarousel'
import TaskRow from './TaskRow'

interface TaskBoardProps {
  groups: TaskGroup[]
  tasks: Task[]
  activeGroupId: number | 'all'
  doubleClickRename: boolean
  onToggleDone: (task: Task) => void
  onSetPriority: (task: Task, priority: TaskPriority) => void
  onReorder: (tasks: Task[]) => Promise<void>
  onRenameGroup: (groupId: number, name: string) => Promise<void>
  onRenameTask: (task: Task, title: string) => Promise<void>
  onCreateTask: (groupId: number) => Promise<void>
  onAddComment: (task: Task, text: string) => Promise<void>
  onDeleteTask: (task: Task) => Promise<void>
  onSelectGroup: (groupId: number) => void
}

function groupTasks(tasks: Task[], groupId: number | null) {
  return tasks
    .filter((task) => task.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function buildReorderPayload(tasks: Task[]): { taskId: number; groupId: number | null; sortOrder: number }[] {
  const byGroup = new Map<number | null, Task[]>()
  tasks.forEach((task) => {
    const key = task.groupId
    if (!byGroup.has(key)) {
      byGroup.set(key, [])
    }
    byGroup.get(key)!.push(task)
  })

  const items: { taskId: number; groupId: number | null; sortOrder: number }[] = []
  byGroup.forEach((groupTasksList, groupId) => {
    groupTasksList
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((task, index) => {
        items.push({ taskId: task.id, groupId, sortOrder: index })
      })
  })
  return items
}

function normalizeSortOrders(tasks: Task[]): Task[] {
  const payload = buildReorderPayload(tasks)
  const orderMap = new Map(payload.map((item) => [item.taskId, item]))
  return tasks.map((task) => {
    const update = orderMap.get(task.id)
    if (!update) {
      return task
    }
    return { ...task, groupId: update.groupId, sortOrder: update.sortOrder }
  })
}

export default function TaskBoard({
  groups,
  tasks,
  activeGroupId,
  doubleClickRename,
  onToggleDone,
  onSetPriority,
  onReorder,
  onRenameGroup,
  onRenameTask,
  onCreateTask,
  onAddComment,
  onDeleteTask,
  onSelectGroup,
}: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)

  const tasksSignature = useMemo(
    () =>
      tasks
        .map(
          (task) =>
            `${task.id}:${task.title}:${task.done}:${task.groupId}:${task.sortOrder}:${task.priority ?? 'NONE'}:${task.comments?.length ?? 0}`,
        )
        .join('|'),
    [tasks],
  )

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasksSignature, tasks])

  useEffect(() => {
    if (expandedTaskId != null && !tasks.some((task) => task.id === expandedTaskId)) {
      setExpandedTaskId(null)
    }
  }, [expandedTaskId, tasks])

  useEffect(() => {
    setExpandedTaskId(null)
  }, [activeGroupId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const visibleGroups = activeGroupId === 'all' ? groups : groups.filter((group) => group.id === activeGroupId)

  const activeGroupIndex =
    typeof activeGroupId === 'number' ? groups.findIndex((group) => group.id === activeGroupId) : -1

  const carouselPrevGroup = activeGroupIndex > 0 ? groups[activeGroupIndex - 1] : null
  const carouselNextGroup =
    activeGroupIndex >= 0 && activeGroupIndex < groups.length - 1 ? groups[activeGroupIndex + 1] : null

  const isCarouselView = activeGroupId !== 'all' && activeGroupIndex >= 0

  function renderGroupSection(group: TaskGroup, index: number) {
    const groupTasksList = groupTasks(localTasks, group.id)
    return (
      <section
        key={group.id}
        className={index > 0 && !isCarouselView ? 'mt-5 border-t border-[#EBEBF0] pt-5' : ''}
      >
        <GroupHeader group={group} onRename={onRenameGroup} onAddTask={(groupId) => void onCreateTask(groupId)} />
        <SortableContext
          id={`group-${group.id}`}
          items={groupTasksList.map((task) => `task-${task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <GroupDropZone groupId={group.id}>
            {groupTasksList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-surface-muted">
                Drop tasks here
              </p>
            ) : (
              groupTasksList.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedTaskId === task.id}
                  doubleClickRename={doubleClickRename}
                  onToggleExpand={handleToggleExpand}
                  onToggleDone={handleToggleDone}
                  onSetPriority={handleSetPriority}
                  onRenameTitle={handleRenameTask}
                  onAddComment={handleAddComment}
                  onDelete={handleDeleteTask}
                />
              ))
            )}

            <div className="group/add flex min-h-6 items-center justify-center">
              <AddCardButton
                onClick={() => void onCreateTask(group.id)}
                className="opacity-0 transition group-hover/add:opacity-100"
              />
            </div>
          </GroupDropZone>
        </SortableContext>
      </section>
    )
  }

  function findContainer(taskId: number) {
    const task = localTasks.find((item) => item.id === taskId)
    return task?.groupId ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = Number(String(event.active.id).replace('task-', ''))
    setActiveTask(localTasks.find((task) => task.id === taskId) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = Number(String(active.id).replace('task-', ''))
    const activeContainer = findContainer(activeId)

    let overContainer: number | null = null
    if (String(over.id).startsWith('group-')) {
      overContainer = Number(String(over.id).replace('group-', ''))
    } else if (String(over.id).startsWith('task-')) {
      overContainer = findContainer(Number(String(over.id).replace('task-', '')))
    }

    if (activeContainer === overContainer || overContainer === undefined) {
      return
    }

    setLocalTasks((current) => {
      const activeIndex = current.findIndex((task) => task.id === activeId)
      if (activeIndex === -1) {
        return current
      }
      const updated = [...current]
      updated[activeIndex] = { ...updated[activeIndex], groupId: overContainer }
      return normalizeSortOrders(updated)
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) {
      return
    }

    const activeId = Number(String(active.id).replace('task-', ''))
    const activeContainer = findContainer(activeId)

    let overContainer = activeContainer
    let overId: number | null = null

    if (String(over.id).startsWith('group-')) {
      overContainer = Number(String(over.id).replace('group-', ''))
    } else if (String(over.id).startsWith('task-')) {
      overId = Number(String(over.id).replace('task-', ''))
      overContainer = findContainer(overId)
    }

    let nextTasks = [...localTasks]

    if (overId && activeId !== overId && overContainer === activeContainer) {
      const groupItems = groupTasks(nextTasks, activeContainer)
      const oldIndex = groupItems.findIndex((task) => task.id === activeId)
      const newIndex = groupItems.findIndex((task) => task.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(groupItems, oldIndex, newIndex)
        nextTasks = nextTasks.map((task) => {
          if (task.groupId !== activeContainer) {
            return task
          }
          const idx = reordered.findIndex((item) => item.id === task.id)
          return idx === -1 ? task : { ...task, sortOrder: idx }
        })
      }
    } else if (overContainer !== activeContainer) {
      nextTasks = nextTasks.map((task) =>
        task.id === activeId ? { ...task, groupId: overContainer } : task,
      )
      nextTasks = normalizeSortOrders(nextTasks)
    }

    setLocalTasks(nextTasks)
    await onReorder(nextTasks)
  }

  function handleSetPriority(task: Task, priority: TaskPriority) {
    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, priority } : item)),
    )
    void onSetPriority(task, priority)
  }

  function handleToggleDone(task: Task) {
    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)),
    )
    void onToggleDone(task)
  }

  function handleToggleExpand(task: Task) {
    setExpandedTaskId((current) => (current === task.id ? null : task.id))
  }

  function handleRenameTask(task: Task, title: string) {
    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, title } : item)),
    )
    return onRenameTask(task, title)
  }

  function handleAddComment(task: Task, text: string) {
    return onAddComment(task, text)
  }

  function handleDeleteTask(task: Task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null)
    }
    setLocalTasks((current) => current.filter((item) => item.id !== task.id))
    void onDeleteTask(task)
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {isCarouselView ? (
          <>
            <ProjectCarouselFrame
              prevGroup={carouselPrevGroup}
              nextGroup={carouselNextGroup}
              onSelectGroup={onSelectGroup}
            >
              {visibleGroups.map((group, index) => renderGroupSection(group, index))}
            </ProjectCarouselFrame>

            {(carouselNextGroup || carouselPrevGroup) && (
              <div className="mx-auto mt-4 flex max-w-xl justify-between gap-3 sm:hidden">
                {carouselNextGroup ? (
                  <button
                    type="button"
                    onClick={() => onSelectGroup(carouselNextGroup.id)}
                    className="truncate rounded-lg px-2 py-1 text-left text-xs text-surface-muted opacity-60 transition hover:opacity-100"
                  >
                    ← {carouselNextGroup.name}
                  </button>
                ) : (
                  <span />
                )}
                {carouselPrevGroup ? (
                  <button
                    type="button"
                    onClick={() => onSelectGroup(carouselPrevGroup.id)}
                    className="truncate rounded-lg px-2 py-1 text-right text-xs text-surface-muted opacity-60 transition hover:opacity-100"
                  >
                    {carouselPrevGroup.name} →
                  </button>
                ) : (
                  <span />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto max-w-xl">
            {visibleGroups.map((group, index) => renderGroupSection(group, index))}
          </div>
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="flex items-center gap-3 rounded-2xl border border-brand-500 bg-white px-4 py-3 shadow-lg">
              <span className="text-sm text-surface-text">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  )
}

export { buildReorderPayload }

function GroupDropZone({ groupId, children }: { groupId: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${groupId}` })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] space-y-2 rounded-2xl border border-dashed p-1 transition ${
        isOver ? 'border-brand-500 bg-brand-50/40' : 'border-transparent hover:border-[#E8E8EF]'
      }`}
    >
      {children}
    </div>
  )
}
