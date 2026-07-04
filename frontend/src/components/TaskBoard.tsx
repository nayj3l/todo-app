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
import GroupHeader from './GroupHeader'
import { ProjectCarouselFrame } from './ProjectCarousel'
import TaskListInsertGutters, { type SeamHoverState } from './TaskListInsertGutters'
import TaskRow from './TaskRow'
import TaskSearchBar from './TaskSearchBar'
import type { PriorityFilterValue } from '../hooks/useTaskFilters'
import { isFilterActive, taskMatchesFilters } from '../utils/taskFilters'

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
  onCreateTask: (groupId: number, insertAtIndex?: number) => Promise<Task | null>
  onAddComment: (task: Task, text: string) => Promise<void>
  onDeleteTask: (task: Task) => Promise<void>
  onSelectGroup: (groupId: number) => void
  searchQuery: string
  priorityFilter: PriorityFilterValue
  onSearchChange: (value: string) => void
  onPriorityChange: (value: PriorityFilterValue) => void
  onClearFilters: () => void
}

function groupTasks(
  tasks: Task[],
  groupId: number | null,
  searchQuery: string,
  priorityFilter: PriorityFilterValue,
) {
  return tasks
    .filter((task) => task.groupId === groupId)
    .filter((task) => taskMatchesFilters(task, searchQuery, priorityFilter))
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

function resolveInsertIndex(
  tasks: Task[],
  groupId: number,
  visibleInsertIndex: number,
  searchQuery: string,
  priorityFilter: PriorityFilterValue,
) {
  const fullList = groupTasks(tasks, groupId, '', 'ALL')
  const visibleList = groupTasks(tasks, groupId, searchQuery, priorityFilter)

  if (visibleList.length === 0) {
    return 0
  }
  if (visibleInsertIndex <= 0) {
    return fullList.findIndex((task) => task.id === visibleList[0].id)
  }
  if (visibleInsertIndex >= visibleList.length) {
    return fullList.findIndex((task) => task.id === visibleList[visibleList.length - 1].id) + 1
  }
  return fullList.findIndex((task) => task.id === visibleList[visibleInsertIndex].id)
}

function insertTaskInGroup(tasks: Task[], task: Task, groupId: number, insertAtIndex: number): Task[] {
  const groupList = tasks
    .filter((item) => item.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const withoutNew = groupList.filter((item) => item.id !== task.id)
  const index = Math.min(Math.max(insertAtIndex, 0), withoutNew.length)
  withoutNew.splice(index, 0, task)
  const orderMap = new Map(withoutNew.map((item, idx) => [item.id, idx]))
  const withNew = tasks.some((item) => item.id === task.id) ? tasks : [...tasks, task]
  return withNew.map((item) =>
    item.groupId === groupId ? { ...item, sortOrder: orderMap.get(item.id) ?? item.sortOrder } : item,
  )
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
  searchQuery,
  priorityFilter,
  onSearchChange,
  onPriorityChange,
  onClearFilters,
}: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)
  const [autoEditTaskId, setAutoEditTaskId] = useState<number | null>(null)
  const [seamHover, setSeamHover] = useState<SeamHoverState | null>(null)
  const [seamGapOpen, setSeamGapOpen] = useState<SeamHoverState | null>(null)

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
    if (!seamHover) {
      setSeamGapOpen(null)
      return
    }
    const timer = setTimeout(() => setSeamGapOpen(seamHover), 120)
    return () => clearTimeout(timer)
  }, [seamHover])

  useEffect(() => {
    if (expandedTaskId != null && !tasks.some((task) => task.id === expandedTaskId)) {
      setExpandedTaskId(null)
    }
  }, [expandedTaskId, tasks])

  useEffect(() => {
    setExpandedTaskId(null)
  }, [activeGroupId])

  useEffect(() => {
    if (autoEditTaskId == null) {
      return
    }
    requestAnimationFrame(() => {
      document.querySelector(`[data-task-id="${autoEditTaskId}"]`)?.scrollIntoView({ block: 'nearest' })
    })
  }, [autoEditTaskId])

  useEffect(() => {
    if (expandedTaskId == null) {
      return
    }
    const task = localTasks.find((item) => item.id === expandedTaskId)
    if (task && !taskMatchesFilters(task, searchQuery, priorityFilter)) {
      setExpandedTaskId(null)
    }
  }, [expandedTaskId, localTasks, priorityFilter, searchQuery])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const visibleGroups = activeGroupId === 'all' ? groups : groups.filter((group) => group.id === activeGroupId)

  const filtersActive = isFilterActive(searchQuery, priorityFilter)

  const scopedTasks = useMemo(() => {
    if (activeGroupId === 'all') {
      return localTasks
    }
    return localTasks.filter((task) => task.groupId === activeGroupId)
  }, [localTasks, activeGroupId])

  const totalScopedCount = scopedTasks.length

  const visibleScopedCount = useMemo(() => {
    if (!filtersActive) {
      return totalScopedCount
    }
    return scopedTasks.filter((task) => taskMatchesFilters(task, searchQuery, priorityFilter)).length
  }, [scopedTasks, searchQuery, priorityFilter, filtersActive, totalScopedCount])

  const displayGroups = useMemo(() => {
    if (!filtersActive || activeGroupId !== 'all') {
      return visibleGroups
    }
    return visibleGroups.filter(
      (group) => groupTasks(localTasks, group.id, searchQuery, priorityFilter).length > 0,
    )
  }, [visibleGroups, localTasks, searchQuery, priorityFilter, filtersActive, activeGroupId])

  const activeGroupIndex =
    typeof activeGroupId === 'number' ? groups.findIndex((group) => group.id === activeGroupId) : -1

  const carouselPrevGroup = activeGroupIndex > 0 ? groups[activeGroupIndex - 1] : null
  const carouselNextGroup =
    activeGroupIndex >= 0 && activeGroupIndex < groups.length - 1 ? groups[activeGroupIndex + 1] : null

  const isCarouselView = activeGroupId !== 'all' && activeGroupIndex >= 0

  function handleCreateTask(groupId: number, insertAtIndex?: number) {
    void (async () => {
      const created = await onCreateTask(groupId, insertAtIndex)
      if (created) {
        setExpandedTaskId(null)
        setAutoEditTaskId(created.id)
      }
    })()
  }

  function handleCreateTaskAt(groupId: number, visibleInsertIndex: number) {
    const insertAtIndex = resolveInsertIndex(
      localTasks,
      groupId,
      visibleInsertIndex,
      searchQuery,
      priorityFilter,
    )
    handleCreateTask(groupId, insertAtIndex)
  }

  function renderGroupSection(group: TaskGroup, index: number) {
    const groupTasksList = groupTasks(localTasks, group.id, searchQuery, priorityFilter)
    const groupHasTasks = groupTasks(localTasks, group.id, '', 'ALL').length > 0
    return (
      <section
        key={group.id}
        className={index > 0 && !isCarouselView ? 'mt-5 border-t border-[#EBEBF0] pt-5' : ''}
      >
        <GroupHeader group={group} onRename={onRenameGroup} onAddTask={handleCreateTask} />
        <SortableContext
          id={`group-${group.id}`}
          items={groupTasksList.map((task) => `task-${task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <GroupDropZone groupId={group.id}>
            {groupTasksList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-surface-muted">
                {filtersActive && groupHasTasks
                  ? 'No tasks match your search or filter'
                  : 'Drop tasks here'}
              </p>
            ) : (
              <div className="relative -mx-14 overflow-visible px-14">
                <TaskListInsertGutters
                  disabled={activeTask != null}
                  layoutRevision={seamGapOpen}
                  onInsert={(insertIndex) => handleCreateTaskAt(group.id, insertIndex)}
                  onSeamHoverChange={setSeamHover}
                >
                  {groupTasksList.map((task, taskIndex) => {
                    const stackPosition =
                      groupTasksList.length === 1
                        ? 'only'
                        : taskIndex === 0
                          ? 'first'
                          : taskIndex === groupTasksList.length - 1
                            ? 'last'
                            : 'middle'

                    const openBefore =
                      seamGapOpen != null &&
                      seamGapOpen.insertIndex === taskIndex &&
                      seamGapOpen.edge === 'top'
                    const openAfter =
                      seamGapOpen != null &&
                      ((seamGapOpen.insertIndex === taskIndex + 1 && seamGapOpen.edge === 'top') ||
                        (seamGapOpen.edge === 'bottom' &&
                          seamGapOpen.insertIndex === groupTasksList.length &&
                          taskIndex === groupTasksList.length - 1))
                    const seamOpen = openBefore || openAfter

                    return (
                      <div
                        key={task.id}
                        className={`relative transition-all duration-200 ease-out ${
                          openBefore ? 'mt-1' : taskIndex > 0 && !openAfter ? '-mt-px' : ''
                        } ${openAfter ? 'mb-1' : ''} ${seamOpen ? 'opacity-[0.97]' : 'opacity-100'}`}
                      >
                        <span
                          data-seam-insert={taskIndex}
                          data-seam-edge="top"
                          className="pointer-events-none absolute left-0 right-0 top-0 h-0"
                        />
                        <TaskRow
                          task={task}
                          expanded={expandedTaskId === task.id}
                          doubleClickRename={doubleClickRename}
                          autoEditTitle={autoEditTaskId === task.id}
                          stackPosition={stackPosition}
                          seamGapAbove={openBefore}
                          seamGapBelow={openAfter}
                          onAutoEditConsumed={() => setAutoEditTaskId(null)}
                          onToggleExpand={handleToggleExpand}
                          onToggleDone={handleToggleDone}
                          onSetPriority={handleSetPriority}
                          onRenameTitle={handleRenameTask}
                          onAddComment={handleAddComment}
                          onDelete={handleDeleteTask}
                        />
                        {taskIndex === groupTasksList.length - 1 && (
                          <span
                            data-seam-insert={groupTasksList.length}
                            data-seam-edge="bottom"
                            className="pointer-events-none absolute bottom-0 left-0 right-0 h-0"
                          />
                        )}
                      </div>
                    )
                  })}
                </TaskListInsertGutters>
              </div>
            )}

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
    setSeamHover(null)
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
      const groupItems = groupTasks(nextTasks, activeContainer, '', 'ALL')
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

  function renderBoardContent() {
    if (filtersActive && visibleScopedCount === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-12 text-center shadow-card">
          <p className="text-sm font-medium text-surface-text">No tasks match your search or filter</p>
          <p className="mt-1 text-xs text-surface-muted">Try a different keyword or priority.</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
          >
            Clear filters
          </button>
        </div>
      )
    }

    return displayGroups.map((group, index) => renderGroupSection(group, index))
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 sm:px-24">
      <div className="mx-auto mb-6 w-full max-w-xl px-1">
        <TaskSearchBar
          searchQuery={searchQuery}
          priorityFilter={priorityFilter}
          onSearchChange={onSearchChange}
          onPriorityChange={onPriorityChange}
          onClear={onClearFilters}
          isActive={filtersActive}
          visibleCount={visibleScopedCount}
          totalCount={totalScopedCount}
        />
      </div>

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
              activeGroupId={activeGroupId}
              activeGroupIndex={activeGroupIndex}
              prevGroup={carouselPrevGroup}
              nextGroup={carouselNextGroup}
              onSelectGroup={onSelectGroup}
            >
              {renderBoardContent()}
            </ProjectCarouselFrame>
          </>
        ) : (
          <div className="mx-auto max-w-xl">{renderBoardContent()}</div>
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

export { buildReorderPayload, insertTaskInGroup }

function GroupDropZone({ groupId, children }: { groupId: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${groupId}` })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] rounded-2xl border border-dashed p-1 transition ${
        isOver ? 'border-brand-500 bg-brand-50/40' : 'border-transparent hover:border-[#E8E8EF]'
      }`}
    >
      {children}
    </div>
  )
}
