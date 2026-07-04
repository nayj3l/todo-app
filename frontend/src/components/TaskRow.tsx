import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types/board'
import { DEFAULT_TASK_TITLE } from '../constants/tasks'
import { getPriorityBorderColor, getPriorityOption, type TaskPriority } from '../types/priority'
import CommentComposer from './CommentComposer'
import PriorityPicker from './PriorityPicker'
import TaskCommentsPanel from './TaskCommentsPanel'
import TaskContextMenu from './TaskContextMenu'

interface TaskRowProps {
  task: Task
  expanded: boolean
  doubleClickRename: boolean
  autoEditTitle?: boolean
  stackPosition?: 'only' | 'first' | 'middle' | 'last'
  seamGapAbove?: boolean
  seamGapBelow?: boolean
  onAutoEditConsumed?: () => void
  onToggleExpand: (task: Task) => void
  onToggleDone: (task: Task) => void
  onSetPriority: (task: Task, priority: TaskPriority) => void
  onRenameTitle: (task: Task, title: string) => Promise<void>
  onAddComment: (task: Task, text: string) => Promise<void>
  onDelete: (task: Task) => void
}

export default function TaskRow({
  task,
  expanded,
  doubleClickRename,
  autoEditTitle = false,
  stackPosition,
  seamGapAbove = false,
  seamGapBelow = false,
  onAutoEditConsumed,
  onToggleExpand,
  onToggleDone,
  onSetPriority,
  onRenameTitle,
  onAddComment,
  onDelete,
}: TaskRowProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoEditStartedRef = useRef(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', taskId: task.id, groupId: task.groupId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
  }

  useEffect(() => {
    setDraft(task.title)
  }, [task.title])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!autoEditTitle) {
      autoEditStartedRef.current = false
      return
    }
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    setDraft(task.title)
    setEditing(true)
  }, [autoEditTitle, task.id, task.title])

  useEffect(() => {
    if (!editing || !autoEditTitle || autoEditStartedRef.current) {
      return
    }
    autoEditStartedRef.current = true
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
      onAutoEditConsumed?.()
    })
  }, [editing, autoEditTitle, onAutoEditConsumed])

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY })
  }

  function handleRowClick() {
    if (editing) {
      return
    }
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    clickTimeoutRef.current = setTimeout(() => {
      onToggleExpand(task)
      clickTimeoutRef.current = null
    }, 200)
  }

  function startRename() {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    setEditing(true)
  }

  function handleTitleDoubleClick(event: React.MouseEvent) {
    if (!doubleClickRename) {
      return
    }
    event.stopPropagation()
    startRename()
  }

  async function commitRename() {
    const next = draft.trim() || DEFAULT_TASK_TITLE
    setEditing(false)
    setDraft(next)
    if (next === task.title) {
      return
    }
    await onRenameTitle(task, next)
  }

  const commentCount = task.comments?.length ?? 0
  const priorityOption = getPriorityOption(task.priority ?? 'NONE')
  const usePriorityBorder = priorityOption.value !== 'NONE'

  const cardStyle = {
    ...style,
    ...(usePriorityBorder ? { borderColor: getPriorityBorderColor(task.priority ?? 'NONE') } : {}),
  }

  const cardBorderClass = usePriorityBorder
    ? ''
    : task.done
      ? 'border-[#DCFCE7]'
      : expanded
        ? 'border-brand-200'
        : 'border-surface-border'

  const cardBgClass = isDragging
    ? 'bg-white opacity-50'
    : task.done
      ? 'bg-[#F0FDF4] opacity-100'
      : 'bg-white opacity-100'

  const stackRadiusClass = (() => {
    const roundTop =
      seamGapAbove || stackPosition === 'only' || stackPosition === 'first' || stackPosition === undefined
    const roundBottom =
      seamGapBelow || stackPosition === 'only' || stackPosition === 'last' || stackPosition === undefined
    if (roundTop && roundBottom) {
      return 'rounded-2xl'
    }
    if (roundTop) {
      return 'rounded-t-2xl rounded-b-none'
    }
    if (roundBottom) {
      return 'rounded-b-2xl rounded-t-none'
    }
    return 'rounded-none'
  })()

  const stackShadowClass =
    stackPosition === 'middle' || stackPosition === 'first'
      ? 'shadow-none'
      : 'shadow-card'

  return (
    <>
      <div
        ref={setNodeRef}
        data-task-id={task.id}
        style={cardStyle}
        className={`overflow-visible border ${stackRadiusClass} ${stackShadowClass} transition-[opacity,background-color,border-color,box-shadow,border-radius] duration-200 ease-out ${cardBorderClass} ${cardBgClass}`}
        onContextMenu={handleContextMenu}
      >
        <div className="flex cursor-pointer items-center gap-3 px-4 py-3" onClick={handleRowClick}>
          <button
            type="button"
            role="checkbox"
            aria-checked={task.done}
            onClick={(event) => {
              event.stopPropagation()
              onToggleDone(task)
            }}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ease-out ${
              task.done
                ? 'scale-100 border-[#86EFAC] bg-[#86EFAC]'
                : 'scale-100 border-[#D5D5DE] bg-white hover:border-green-400'
            }`}
            aria-label={`Mark ${task.title} as ${task.done ? 'incomplete' : 'complete'}`}
          >
            <svg
              viewBox="0 0 12 12"
              className={`h-2.5 w-2.5 transition-all duration-200 ease-out ${
                task.done ? 'scale-100 text-green-700 opacity-100' : 'scale-75 text-white opacity-0'
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          </button>

          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onBlur={() => void commitRename()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitRename()
                }
                if (event.key === 'Escape') {
                  setDraft(task.title)
                  setEditing(false)
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-brand-500 bg-white px-2 py-1 text-sm text-surface-text outline-none ring-2 ring-brand-100"
            />
          ) : (
            <span
              onDoubleClick={handleTitleDoubleClick}
              title={doubleClickRename ? 'Double-click to rename' : 'Right-click to rename'}
              className={`min-w-0 flex-1 truncate text-sm transition-[color,opacity] duration-200 ease-out ${
                task.done
                  ? 'text-[#6B9080] line-through decoration-[#9DC4AD]/80'
                  : 'text-surface-text'
              }`}
            >
              {task.title}
            </span>
          )}

          {commentCount > 0 && (
            <span
              className={`flex shrink-0 items-center gap-1 ${expanded ? 'text-brand-500' : 'text-[#9A9AA8]'}`}
              title={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}
              aria-label={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[11px] font-medium tabular-nums">{commentCount}</span>
            </span>
          )}

          <div
            className="relative flex shrink-0 items-center gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <PriorityPicker
              priority={task.priority ?? 'NONE'}
              onChange={(priority) => onSetPriority(task, priority)}
            />
            <button
              type="button"
              className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-lg text-surface-muted transition-colors duration-150 hover:bg-[#F3F3F6] hover:text-surface-text active:cursor-grabbing"
              aria-label="Drag task"
              onClick={(event) => event.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="7" r="1.5" />
                <circle cx="15" cy="7" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="17" r="1.5" />
                <circle cx="15" cy="17" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`comment-panel-grid overflow-hidden rounded-b-2xl ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className={`min-h-0 overflow-hidden ${expanded ? '' : 'pointer-events-none'}`}>
            {(task.comments?.length ?? 0) > 0 && (
              <TaskCommentsPanel comments={task.comments ?? []} />
            )}
            <CommentComposer
              expanded={expanded}
              onAddComment={(text) => onAddComment(task, text)}
            />
          </div>
        </div>
      </div>

      {menu && (
        <TaskContextMenu
          x={menu.x}
          y={menu.y}
          onRename={startRename}
          onDelete={() => onDelete(task)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}
