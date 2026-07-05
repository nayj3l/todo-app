import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  defaultDropAnimation,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { Task, TaskGroup } from '../types/board'
import type { TaskPriority } from '../types/priority'
import type { PriorityFilterValue } from '../hooks/useTaskFilters'
import type { BoardView } from '../types/settings'
import BoardViewToggle from './BoardViewToggle'
import GroupHeader from './GroupHeader'
import ProjectGroupDragPreview from './ProjectGroupDragPreview'
import { ProjectCarouselFrame } from './ProjectCarousel'
import SortableGroupSection, { type GroupDragHandleProps } from './SortableGroupSection'
import TaskDragPreview from './TaskDragPreview'
import TaskInsertSlot from './TaskInsertSlot'
import TaskRow from './TaskRow'
import TaskSearchBar from './TaskSearchBar'
import ConfirmDialog from './ConfirmDialog'
import { isFilterActive, taskMatchesFilters } from '../utils/taskFilters'
import { summarizeGroupTasks } from '../utils/groupStats'
import { AUTO_EDIT_FOCUS_KEEPALIVE_MS } from '../constants/tasks'
import { scheduleFocusNewTaskTitleInput } from '../utils/focusNewTaskTitle'

interface TaskBoardProps {
  groups: TaskGroup[]
  tasks: Task[]
  activeGroupId: number | 'all'
  doubleClickRename: boolean
  showProjectTaskBreakdown: boolean
  showProjectProgressBar: boolean
  onToggleDone: (task: Task) => void
  onSetPriority: (task: Task, priority: TaskPriority) => void
  onReorder: (tasks: Task[]) => Promise<void>
  onReorderGroups: (groups: TaskGroup[]) => Promise<void>
  onRenameGroup: (groupId: number, name: string) => Promise<void>
  onRenameTask: (task: Task, title: string) => Promise<void>
  onCreateTask: (groupId: number, insertAtIndex?: number) => Promise<Task | null>
  onAddComment: (task: Task, text: string) => Promise<void>
  onUpdateComment: (task: Task, commentId: number, text: string) => Promise<void>
  onDeleteComment: (task: Task, commentId: number) => Promise<void>
  onDeleteTask: (task: Task) => Promise<void>
  onDeleteTasks: (tasks: Task[]) => Promise<void>
  onDeleteGroup: (groupId: number) => Promise<void>
  onSelectGroup: (groupId: number) => void
  searchQuery: string
  priorityFilter: PriorityFilterValue
  onSearchChange: (value: string) => void
  onPriorityChange: (value: PriorityFilterValue) => void
  onClearFilters: () => void
  boardView: BoardView
  wrapTaskTitles: boolean
  boardZoom?: number
  autoEditTaskId?: number | null
  onAutoEditConsumed?: () => void
  onBoardViewChange: (view: BoardView) => void
  onWrapTaskTitlesChange: (wrap: boolean) => void
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

function resolveGroupIdFromDndId(overId: string, tasks: Task[]): number | null {
  if (overId.startsWith('column-')) {
    return Number(overId.replace('column-', ''))
  }
  if (overId.startsWith('group-')) {
    return Number(overId.replace('group-', ''))
  }
  if (overId.startsWith('task-')) {
    const taskId = Number(overId.replace('task-', ''))
    return tasks.find((task) => task.id === taskId)?.groupId ?? null
  }
  return null
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
  showProjectTaskBreakdown,
  showProjectProgressBar,
  onToggleDone,
  onSetPriority,
  onReorder,
  onReorderGroups,
  onRenameGroup,
  onRenameTask,
  onCreateTask,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onDeleteTask,
  onDeleteTasks,
  onDeleteGroup,
  onSelectGroup,
  searchQuery,
  priorityFilter,
  onSearchChange,
  onPriorityChange,
  onClearFilters,
  boardView,
  wrapTaskTitles,
  boardZoom = 1,
  autoEditTaskId = null,
  onAutoEditConsumed,
  onBoardViewChange,
  onWrapTaskTitlesChange,
}: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localGroups, setLocalGroups] = useState(groups)
  const localGroupsRef = useRef(localGroups)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeGroup, setActiveGroup] = useState<TaskGroup | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(() => new Set())
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<TaskGroup | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [seamHover, setSeamHover] = useState<{
    insertIndex: number
    edge: 'top' | 'bottom'
    zone: 'left' | 'right'
  } | null>(null)

  const tasksSignature = useMemo(
    () =>
      tasks
        .map(
          (task) =>
            `${task.id}:${task.title}:${task.done}:${task.groupId}:${task.sortOrder}:${task.priority ?? 'NONE'}:${task.comments?.map((comment) => `${comment.id}:${comment.text}`).join(';') ?? ''}`,
        )
        .join('|'),
    [tasks],
  )

  const groupsSignature = useMemo(
    () =>
      groups
        .map((group) => `${group.id}:${group.name}:${group.sortOrder}:${group.color}:${group.taskCount}`)
        .join('|'),
    [groups],
  )

  useEffect(() => {
    setLocalGroups(groups)
  }, [groupsSignature, groups])

  useEffect(() => {
    localGroupsRef.current = localGroups
  }, [localGroups])

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

  useEffect(() => {
    if (autoEditTaskId == null) {
      return
    }
    const taskId = autoEditTaskId
    const getTitleInput = () => {
      const row = document.querySelector(`[data-task-id="${taskId}"]`)
      const input = row?.querySelector('[data-testid="task-title-input"]')
      return input instanceof HTMLInputElement ? input : null
    }

    const timers = AUTO_EDIT_FOCUS_KEEPALIVE_MS.map((delayMs) =>
      window.setTimeout(() => {
        const input = getTitleInput()
        if (!input) {
          return
        }
        if (delayMs === 0) {
          input.closest('[data-task-id]')?.scrollIntoView({ block: 'nearest' })
        }
        if (document.activeElement !== input) {
          scheduleFocusNewTaskTitleInput(getTitleInput)
        }
      }, delayMs),
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  )

  const visibleGroups =
    activeGroupId === 'all' ? localGroups : localGroups.filter((group) => group.id === activeGroupId)

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
    typeof activeGroupId === 'number' ? localGroups.findIndex((group) => group.id === activeGroupId) : -1

  const carouselPrevGroup = activeGroupIndex > 0 ? localGroups[activeGroupIndex - 1] : null
  const carouselNextGroup =
    activeGroupIndex >= 0 && activeGroupIndex < localGroups.length - 1
      ? localGroups[activeGroupIndex + 1]
      : null

  const isCarouselView = activeGroupId !== 'all' && activeGroupIndex >= 0
  const isColumnView = boardView === 'columns' && activeGroupId === 'all' && !isCarouselView
  const isListView = !isColumnView
  const canReorderProjects = activeGroupId === 'all' && !filtersActive && !isCarouselView
  const listDragOverlayZoom = isListView && boardZoom !== 1 ? 1 / boardZoom : undefined

  const skipBoardViewAnimation = useRef(true)
  const [viewEnterFrom, setViewEnterFrom] = useState<BoardView | null>(null)

  useEffect(() => {
    if (skipBoardViewAnimation.current) {
      skipBoardViewAnimation.current = false
      return
    }
    if (isCarouselView) {
      return
    }
    setViewEnterFrom(boardView)
    const timer = window.setTimeout(() => setViewEnterFrom(null), 360)
    return () => window.clearTimeout(timer)
  }, [boardView, isCarouselView])

  const visibleSelectableTasks = useMemo(
    () => scopedTasks.filter((task) => taskMatchesFilters(task, searchQuery, priorityFilter)),
    [scopedTasks, searchQuery, priorityFilter],
  )

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedTaskIds(new Set())
  }

  function toggleTaskSelected(task: Task) {
    setSelectedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(task.id)) {
        next.delete(task.id)
      } else {
        next.add(task.id)
      }
      return next
    })
  }

  function selectAllVisibleTasks() {
    setSelectedTaskIds(new Set(visibleSelectableTasks.map((task) => task.id)))
  }

  function taskSelectionProps(taskId: number) {
    return {
      selectionMode,
      selected: selectedTaskIds.has(taskId),
      onToggleSelected: toggleTaskSelected,
    }
  }

  useEffect(() => {
    exitSelectionMode()
  }, [activeGroupId])

  const boardViewEnterClass =
    viewEnterFrom === 'columns'
      ? 'board-view-enter-columns'
      : viewEnterFrom === 'list'
        ? 'board-view-enter-list'
        : ''

  function renderTaskList(group: TaskGroup, groupTasksList: Task[], groupHasTasks: boolean, columnLayout: boolean) {
    if (groupTasksList.length === 0) {
      if (filtersActive && groupHasTasks) {
        return (
          <p className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-surface-muted">
            No tasks match your search or filter
          </p>
        )
      }
      return selectionMode ? null : <AddTaskCard onClick={() => handleCreateTaskAt(group.id, 0)} />
    }

    if (columnLayout) {
      return (
        <div className="board-column-tasks flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain py-0.5">
          {groupTasksList.map((task) => (
            <div key={task.id} className="shrink-0">
            <TaskRow
              task={task}
              wrapTaskTitles={wrapTaskTitles}
              expanded={expandedTaskId === task.id}
              doubleClickRename={doubleClickRename}
              autoEditTitle={autoEditTaskId === task.id}
              variant="standalone"
              onAutoEditConsumed={onAutoEditConsumed}
              onToggleExpand={handleToggleExpand}
              onToggleDone={handleToggleDone}
              onSetPriority={handleSetPriority}
              onRenameTitle={handleRenameTask}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onDelete={handleDeleteTask}
              {...taskSelectionProps(task.id)}
            />
            </div>
          ))}
          {!activeTask && !selectionMode && (
            <AddTaskCard onClick={() => handleCreateTaskAt(group.id, groupTasksList.length)} />
          )}
        </div>
      )
    }

    return (
      <div
        className={`relative -mx-14 overflow-visible px-14 ${wrapTaskTitles ? 'space-y-2' : ''}`}
      >
        {groupTasksList.map((task, taskIndex) => {
          const useStandaloneListLayout = wrapTaskTitles
          const stackPosition = useStandaloneListLayout
            ? undefined
            : groupTasksList.length === 1
              ? 'only'
              : taskIndex === 0
                ? 'first'
                : taskIndex === groupTasksList.length - 1
                  ? 'last'
                  : 'middle'

          const openBefore =
            !useStandaloneListLayout &&
            seamHover != null &&
            seamHover.insertIndex === taskIndex &&
            seamHover.edge === 'top'
          const openAfter =
            !useStandaloneListLayout &&
            seamHover != null &&
            ((seamHover.insertIndex === taskIndex + 1 && seamHover.edge === 'top') ||
              (seamHover.edge === 'bottom' &&
                seamHover.insertIndex === groupTasksList.length &&
                taskIndex === groupTasksList.length - 1))
          const seamCurveAbove = openBefore
          const seamCurveBelow = openAfter
          const seamZone = openBefore || openAfter ? (seamHover?.zone ?? null) : null

          return (
            <div
              key={task.id}
              className={`relative ${useStandaloneListLayout || taskIndex === 0 ? '' : '-mt-px'}`}
            >
              {!activeTask && !selectionMode && (
                <TaskInsertSlot
                  onInsert={() => handleCreateTaskAt(group.id, taskIndex)}
                  onHoverChange={(active, zone) => {
                    setSeamHover(active && zone ? { insertIndex: taskIndex, edge: 'top', zone } : null)
                  }}
                />
              )}
              <TaskRow
                task={task}
                wrapTaskTitles={wrapTaskTitles}
                dragWithOverlay={!columnLayout}
                expanded={expandedTaskId === task.id}
                doubleClickRename={doubleClickRename}
                autoEditTitle={autoEditTaskId === task.id}
                variant={useStandaloneListLayout ? 'standalone' : 'stacked'}
                stackPosition={stackPosition}
                seamGapAbove={seamCurveAbove}
                seamGapBelow={seamCurveBelow}
                seamZone={seamZone}
                onAutoEditConsumed={onAutoEditConsumed}
                onToggleExpand={handleToggleExpand}
                onToggleDone={handleToggleDone}
                onSetPriority={handleSetPriority}
                onRenameTitle={handleRenameTask}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onDelete={handleDeleteTask}
                {...taskSelectionProps(task.id)}
              />
              {!activeTask && !selectionMode && taskIndex === groupTasksList.length - 1 && (
                <TaskInsertSlot
                  position="bottom"
                  onInsert={() => handleCreateTaskAt(group.id, groupTasksList.length)}
                  onHoverChange={(active, zone) => {
                    setSeamHover(
                      active && zone
                        ? { insertIndex: groupTasksList.length, edge: 'bottom', zone }
                        : null,
                    )
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderGroupSectionInner(
    group: TaskGroup,
    columnLayout: boolean,
    dragHandle?: GroupDragHandleProps,
  ) {
    const groupTasksList = groupTasks(localTasks, group.id, searchQuery, priorityFilter)
    const groupHasTasks = groupTasks(localTasks, group.id, '', 'ALL').length > 0
    const groupSummary = summarizeGroupTasks(localTasks, group.id, searchQuery, priorityFilter)

    return (
      <>
        <div className="shrink-0">
          <GroupHeader
            group={group}
            summary={groupSummary}
            filtersActive={filtersActive}
            showTaskBreakdown={showProjectTaskBreakdown}
            showProgressBar={showProjectProgressBar}
            onRename={onRenameGroup}
            onDelete={(board) => setDeleteBoardTarget(board)}
            dragHandle={dragHandle}
          />
        </div>
        <SortableContext
          id={`group-${group.id}`}
          items={groupTasksList.map((task) => `task-${task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className={columnLayout ? 'flex min-h-0 flex-1 flex-col' : undefined}>
            <GroupDropZone groupId={group.id} columnLayout={columnLayout}>
              {renderTaskList(group, groupTasksList, groupHasTasks, columnLayout)}
            </GroupDropZone>
          </div>
        </SortableContext>
      </>
    )
  }

  function renderGroupSection(group: TaskGroup, index: number, columnLayout = false) {
    const sectionClass = columnLayout
      ? 'board-column-card flex h-full min-h-0 w-[min(320px,88vw)] shrink-0 flex-col self-stretch rounded-2xl border border-surface-border bg-[#FAFAFB] p-3 shadow-sm'
      : index > 0 && !isCarouselView
        ? 'board-list-section mt-5 border-t border-[#EBEBF0] pt-5'
        : 'board-list-section'

    if (!canReorderProjects) {
      return (
        <section key={group.id} className={sectionClass}>
          {renderGroupSectionInner(group, columnLayout)}
        </section>
      )
    }

    return (
      <SortableGroupSection
        key={group.id}
        group={group}
        className={sectionClass}
        dragWithOverlay
      >
        {({ dragHandle }) => renderGroupSectionInner(group, columnLayout, dragHandle)}
      </SortableGroupSection>
    )
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

  function handleCreateTask(groupId: number, insertAtIndex?: number) {
    void (async () => {
      setSeamHover(null)
      const created = await onCreateTask(groupId, insertAtIndex)
      if (created) {
        setExpandedTaskId(null)
        flushSync(() => {
          setLocalTasks((current) => {
            if (current.some((task) => task.id === created.id)) {
              return current
            }
            return insertAtIndex != null
              ? insertTaskInGroup(current, created, groupId, insertAtIndex)
              : [...current, created]
          })
        })
      }
    })()
  }

  function findContainer(taskId: number) {
    const task = localTasks.find((item) => item.id === taskId)
    return task?.groupId ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    if (selectionMode) {
      return
    }
    const activeId = String(event.active.id)
    setSeamHover(null)
    document.body.classList.add('is-dragging-task')

    if (activeId.startsWith('column-')) {
      const groupId = Number(activeId.replace('column-', ''))
      setActiveGroup(localGroups.find((group) => group.id === groupId) ?? null)
      setActiveTask(null)
      return
    }

    if (activeId.startsWith('task-')) {
      const taskId = Number(activeId.replace('task-', ''))
      setActiveTask(localTasks.find((task) => task.id === taskId) ?? null)
      setActiveGroup(null)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    if (activeIdStr.startsWith('column-')) {
      if (!canReorderProjects) {
        return
      }

      const activeColumnId = Number(activeIdStr.replace('column-', ''))
      const overColumnId = resolveGroupIdFromDndId(overIdStr, localTasks)
      if (overColumnId == null || activeColumnId === overColumnId) {
        return
      }

      setLocalGroups((current) => {
        const oldIndex = current.findIndex((group) => group.id === activeColumnId)
        const newIndex = current.findIndex((group) => group.id === overColumnId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return current
        }
        return arrayMove(current, oldIndex, newIndex).map((group, index) => ({
          ...group,
          sortOrder: index,
        }))
      })
      return
    }

    if (!activeIdStr.startsWith('task-')) {
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
    const activeIdStr = String(active.id)
    document.body.classList.remove('is-dragging-task')

    if (activeIdStr.startsWith('column-')) {
      if (isColumnView) {
        setActiveGroup(null)
      } else {
        window.setTimeout(() => setActiveGroup(null), 240)
      }

      if (!over || !canReorderProjects) {
        return
      }

      await onReorderGroups(localGroupsRef.current)
      return
    }

    if (isColumnView) {
      setActiveTask(null)
    } else {
      window.setTimeout(() => setActiveTask(null), 240)
    }

    if (!over || !activeIdStr.startsWith('task-')) {
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

  function handleUpdateComment(task: Task, commentId: number, text: string) {
    setLocalTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              comments: (item.comments ?? []).map((comment) =>
                comment.id === commentId ? { ...comment, text } : comment,
              ),
            }
          : item,
      ),
    )
    return onUpdateComment(task, commentId, text)
  }

  function handleDeleteComment(task: Task, commentId: number) {
    setLocalTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, comments: (item.comments ?? []).filter((comment) => comment.id !== commentId) }
          : item,
      ),
    )
    return onDeleteComment(task, commentId)
  }

  function handleDeleteSelectedTasks() {
    const selected = localTasks.filter((task) => selectedTaskIds.has(task.id))
    if (selected.length === 0) {
      return
    }
    setExpandedTaskId(null)
    setLocalTasks((current) => current.filter((task) => !selectedTaskIds.has(task.id)))
    exitSelectionMode()
    void onDeleteTasks(selected)
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

    if (isColumnView) {
      const columns = (
        <div className="board-columns-scroll flex h-full min-h-0 flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden px-1 pt-0">
          {displayGroups.map((group, index) => renderGroupSection(group, index, true))}
        </div>
      )

      if (!canReorderProjects) {
        return columns
      }

      return (
        <SortableContext
          items={displayGroups.map((group) => `column-${group.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {columns}
        </SortableContext>
      )
    }

    const listSections = displayGroups.map((group, index) => renderGroupSection(group, index))

    if (!canReorderProjects) {
      return listSections
    }

    return (
      <SortableContext
        items={displayGroups.map((group) => `column-${group.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {listSections}
      </SortableContext>
    )
  }

  return (
    <main
      className={`board-main-shell flex h-full min-h-0 flex-1 flex-col ${
        isColumnView
          ? 'overflow-hidden px-4 pb-3 pt-4 sm:px-5 sm:pt-4'
          : 'overflow-y-auto px-8 pt-8 pb-20 sm:px-24 sm:pb-28'
      }`}
    >
      <div
        className={`board-toolbar-shell flex shrink-0 items-start gap-3 px-1 ${
          isColumnView ? 'mb-3 w-full max-w-none' : 'mx-auto mb-6 w-full max-w-xl'
        }`}
      >
        <div className="min-w-0 flex-1">
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
        <BoardViewToggle
          boardView={boardView}
          wrapTaskTitles={wrapTaskTitles}
          columnsAvailable={activeGroupId === 'all'}
          onBoardViewChange={onBoardViewChange}
          onWrapTaskTitlesChange={onWrapTaskTitlesChange}
        />
        {!selectionMode ? (
          <button
            type="button"
            onClick={() => {
              setSelectionMode(true)
              setSelectedTaskIds(new Set())
            }}
            disabled={visibleSelectableTasks.length === 0}
            className="shrink-0 rounded-xl border border-surface-border bg-white px-3 py-2 text-sm font-medium text-surface-text shadow-card transition hover:bg-[#FAFAFB] disabled:cursor-not-allowed disabled:opacity-50"
            title="Select multiple tasks to delete"
          >
            Select
          </button>
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-1 sm:items-stretch">
            <button
              type="button"
              onClick={selectAllVisibleTasks}
              className="rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="rounded-xl border border-surface-border bg-white px-3 py-2 text-sm font-medium text-surface-text shadow-card transition hover:bg-[#FAFAFB]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex h-full min-h-0 flex-1 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTask(null)
          setActiveGroup(null)
          document.body.classList.remove('is-dragging-task')
        }}
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
          <div
            className={`board-content-shell ${isColumnView ? 'is-columns' : 'is-list'} ${boardViewEnterClass}`}
          >
            {renderBoardContent()}
          </div>
        )}

        <DragOverlay
          dropAnimation={
            isColumnView || activeGroup != null
              ? null
              : { ...defaultDropAnimation, duration: 220 }
          }
          adjustScale={isColumnView}
          style={listDragOverlayZoom ? { zoom: listDragOverlayZoom } : undefined}
        >
          {activeTask ? (
            <TaskDragPreview task={activeTask} wrapTaskTitles={wrapTaskTitles} />
          ) : activeGroup ? (
            <ProjectGroupDragPreview group={activeGroup} columnLayout={isColumnView} />
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>

      {selectionMode && selectedTaskIds.size > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
          data-testid="bulk-delete-bar"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-lg">
            <span className="text-sm font-medium text-surface-text">
              {selectedTaskIds.size} task{selectedTaskIds.size === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-surface-text transition hover:bg-[#FAFAFB]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title={`Delete ${selectedTaskIds.size} task${selectedTaskIds.size === 1 ? '' : 's'}?`}
        description="Selected tasks will move to the recycle bin."
        confirmLabel="Delete"
        onConfirm={() => {
          handleDeleteSelectedTasks()
          setBulkDeleteConfirmOpen(false)
        }}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteBoardTarget != null}
        title="Delete board?"
        description={
          deleteBoardTarget
            ? `Delete "${deleteBoardTarget.name}" and move its tasks to the recycle bin?`
            : ''
        }
        confirmLabel="Delete board"
        onConfirm={() => {
          if (deleteBoardTarget) {
            void onDeleteGroup(deleteBoardTarget.id)
            setDeleteBoardTarget(null)
          }
        }}
        onCancel={() => setDeleteBoardTarget(null)}
      />
    </main>
  )
}

export { buildReorderPayload, insertTaskInGroup }

function AddTaskCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="add-task-card"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label="Add new task"
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D5D5DE] bg-[#F5F5F7] px-4 py-3 text-sm text-surface-muted transition hover:border-[#C8C8D4] hover:bg-[#EEEEF2] hover:text-[#7A7A88] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
      <span className="truncate">Add new task</span>
    </button>
  )
}

function GroupDropZone({
  groupId,
  columnLayout = false,
  children,
}: {
  groupId: number
  columnLayout?: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${groupId}` })
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[48px] flex-col ${
        columnLayout ? 'min-h-0 flex-1' : ''
      } rounded-2xl border border-dashed p-1 transition ${
        isOver
          ? 'border-brand-500 bg-brand-50/40'
          : columnLayout
            ? 'border-transparent'
            : 'border-transparent hover:border-[#E8E8EF]'
      }`}
    >
      {children}
    </div>
  )
}
