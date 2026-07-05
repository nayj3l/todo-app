import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Task, TaskComment } from '../types/board'
import { DEFAULT_TASK_TITLE, AUTO_EDIT_BLUR_GRACE_MS } from '../constants/tasks'
import { getPriorityOption, type TaskPriority } from '../types/priority'
import { focusNewTaskTitleInput, scheduleFocusNewTaskTitleInput } from '../utils/focusNewTaskTitle'
import CommentComposer from './CommentComposer'
import PriorityPicker from './PriorityPicker'
import TaskCommentsPanel from './TaskCommentsPanel'
import TaskContextMenu from './TaskContextMenu'

interface TaskRowProps {
  task: Task
  wrapTaskTitles?: boolean
  expanded: boolean
  doubleClickRename: boolean
  autoEditTitle?: boolean
  stackPosition?: 'only' | 'first' | 'middle' | 'last'
  seamGapAbove?: boolean
  seamGapBelow?: boolean
  seamZone?: 'left' | 'right' | null
  variant?: 'stacked' | 'standalone'
  dragWithOverlay?: boolean
  onAutoEditConsumed?: () => void
  onToggleExpand: (task: Task) => void
  onToggleDone: (task: Task) => void
  onSetPriority: (task: Task, priority: TaskPriority) => void
  onRenameTitle: (task: Task, title: string) => Promise<void>
  onAddComment: (task: Task, text: string) => Promise<void>
  onUpdateComment: (task: Task, commentId: number, text: string) => Promise<void>
  onDeleteComment: (task: Task, commentId: number) => Promise<void>
  onDelete: (task: Task) => void
}

export default function TaskRow({
  task,
  wrapTaskTitles = false,
  expanded,
  doubleClickRename,
  autoEditTitle = false,
  stackPosition,
  seamGapAbove = false,
  seamGapBelow = false,
  seamZone = null,
  variant = 'stacked',
  dragWithOverlay = false,
  onAutoEditConsumed,
  onToggleExpand,
  onToggleDone,
  onSetPriority,
  onRenameTitle,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onDelete,
}: TaskRowProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAutoFocusRef = useRef(false)
  const wasAutoEditRef = useRef(false)
  const autoEditStartedAtRef = useRef(0)
  const isStandalone = variant === 'standalone'
  const useDragPlaceholder = isStandalone || dragWithOverlay

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', taskId: task.id, groupId: task.groupId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  useEffect(() => {
    setDraft(task.title)
  }, [task.title])

  useEffect(() => {
    if (editing && !autoEditTitle) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, autoEditTitle])

  useLayoutEffect(() => {
    if (!autoEditTitle) {
      return
    }
    wasAutoEditRef.current = true
    pendingAutoFocusRef.current = true
    autoEditStartedAtRef.current = performance.now()
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    setDraft(task.title)
    setEditing(true)
  }, [autoEditTitle, task.id, task.title])

  function bindAutoEditInputRef(node: HTMLInputElement | null) {
    inputRef.current = node
    if (node && pendingAutoFocusRef.current) {
      pendingAutoFocusRef.current = false
      scheduleFocusNewTaskTitleInput(() => node)
    }
  }

  function finishAutoEditSession() {
    if (!wasAutoEditRef.current) {
      return
    }
    wasAutoEditRef.current = false
    onAutoEditConsumed?.()
  }

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
    if (editing || autoEditTitle || wasAutoEditRef.current) {
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

  function handleTitleBlur() {
    window.setTimeout(() => {
      if (document.activeElement === inputRef.current) {
        return
      }

      const inAutoEditGrace =
        wasAutoEditRef.current &&
        performance.now() - autoEditStartedAtRef.current < AUTO_EDIT_BLUR_GRACE_MS

      if (inAutoEditGrace) {
        scheduleFocusNewTaskTitleInput(() => inputRef.current)
        return
      }

      void commitRename()
    }, 0)
  }

  async function commitRename() {
    const next = draft.trim() || DEFAULT_TASK_TITLE
    setEditing(false)
    finishAutoEditSession()
    setDraft(next)
    if (next === task.title) {
      return
    }
    await onRenameTitle(task, next)
  }

  const commentCount = task.comments?.length ?? 0
  const priorityOption = getPriorityOption(task.priority ?? 'NONE')
  const usePriorityAccent = priorityOption.value !== 'NONE'

  const hasStackShadow = !isStandalone && stackPosition !== 'middle' && stackPosition !== 'first'

  const cardStyle = {
    ...style,
    ...(hasStackShadow && !usePriorityAccent ? { boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)' } : {}),
    ...(usePriorityAccent
      ? {
          boxShadow: [
            hasStackShadow && !usePriorityAccent ? '0 1px 2px rgba(16, 24, 40, 0.04)' : null,
            `inset 2px 0 0 ${priorityOption.color}`,
          ]
            .filter(Boolean)
            .join(', '),
        }
      : {}),
  }

  const cardBorderClass = task.done
    ? 'border-[#DCFCE7]'
    : expanded
      ? 'border-brand-200'
      : 'border-surface-border'

  const cardBgClass = isDragging
    ? useDragPlaceholder
      ? 'relative opacity-0'
      : `relative z-20 opacity-100 shadow-lg ${task.done ? 'bg-[#F0FDF4]' : 'bg-white'}`
    : task.done
      ? 'bg-[#F0FDF4] opacity-100'
      : 'bg-white opacity-100'

  const stackRadiusClass = isStandalone
    ? 'rounded-2xl'
    : (() => {
    const isOnly = stackPosition === 'only' || stackPosition === undefined
    const isFirst = stackPosition === 'first'
    const isLast = stackPosition === 'last'

    let topLeft = isOnly || isFirst ? 'rounded-tl-2xl' : 'rounded-tl-none'
    let topRight = isOnly || isFirst ? 'rounded-tr-2xl' : 'rounded-tr-none'
    let bottomLeft = isOnly || isLast ? 'rounded-bl-2xl' : 'rounded-bl-none'
    let bottomRight = isOnly || isLast ? 'rounded-br-2xl' : 'rounded-br-none'

    if (seamGapAbove && seamZone === 'left') {
      topLeft = 'rounded-tl-2xl'
      if (!isOnly && !isFirst) {
        topRight = 'rounded-tr-none'
      }
    } else if (seamGapAbove && seamZone === 'right') {
      topRight = 'rounded-tr-2xl'
      if (!isOnly && !isFirst) {
        topLeft = 'rounded-tl-none'
      }
    }

    if (seamGapBelow && seamZone === 'left') {
      bottomLeft = 'rounded-bl-2xl'
      if (!isOnly && !isLast) {
        bottomRight = 'rounded-br-none'
      }
    } else if (seamGapBelow && seamZone === 'right') {
      bottomRight = 'rounded-br-2xl'
      if (!isOnly && !isLast) {
        bottomLeft = 'rounded-bl-none'
      }
    }

    return `${topLeft} ${topRight} ${bottomLeft} ${bottomRight}`
  })()

  const stackShadowClass = isStandalone
    ? usePriorityAccent
      ? ''
      : 'shadow-card'
    : usePriorityAccent
      ? ''
      : stackPosition === 'middle' || stackPosition === 'first'
        ? 'shadow-none'
        : 'shadow-card'

  return (
    <>
      <div
        ref={setNodeRef}
        data-task-id={task.id}
        style={cardStyle}
        className={`relative overflow-hidden border ${stackRadiusClass} ${stackShadowClass} transition-[opacity,background-color,border-color,box-shadow,border-radius] duration-200 ease-out ${cardBorderClass} ${cardBgClass}`}
        {...attributes}
      >
        <div
          className={`flex touch-none gap-3 px-4 py-3 ${
            wrapTaskTitles ? 'items-start' : 'items-center'
          } ${editing ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onClick={handleRowClick}
          onContextMenu={handleContextMenu}
          {...(editing ? {} : listeners)}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={task.done}
            onPointerDown={(event) => event.stopPropagation()}
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
              ref={bindAutoEditInputRef}
              data-testid="task-title-input"
              value={draft}
              autoFocus={autoEditTitle}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={(event) => {
                if (wasAutoEditRef.current || pendingAutoFocusRef.current) {
                  focusNewTaskTitleInput(event.currentTarget)
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onBlur={handleTitleBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitRename()
                }
                if (event.key === 'Escape') {
                  setDraft(task.title)
                  setEditing(false)
                  finishAutoEditSession()
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-brand-500 bg-white px-2 py-1 text-sm text-surface-text outline-none ring-2 ring-brand-100"
            />
          ) : (
            <span
              onDoubleClick={handleTitleDoubleClick}
              title={doubleClickRename ? 'Double-click to rename' : 'Right-click to rename'}
              className={`min-w-0 flex-1 self-center text-sm transition-[color,opacity] duration-200 ease-out ${
                wrapTaskTitles ? 'whitespace-normal break-words leading-snug' : 'truncate'
              } ${
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
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <PriorityPicker
              priority={task.priority ?? 'NONE'}
              onChange={(priority) => onSetPriority(task, priority)}
            />
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-surface-muted"
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="7" r="1.5" />
                <circle cx="15" cy="7" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="17" r="1.5" />
                <circle cx="15" cy="17" r="1.5" />
              </svg>
            </span>
          </div>
        </div>

        {!isDragging && (
        <div
          className={`comment-panel-grid overflow-hidden rounded-b-2xl ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className={`min-h-0 overflow-hidden ${expanded ? '' : 'pointer-events-none'}`}>
            {(task.comments?.length ?? 0) > 0 && (
              <TaskCommentsPanel
                comments={task.comments ?? []}
                onUpdateComment={(comment: TaskComment, text: string) =>
                  onUpdateComment(task, comment.id, text)
                }
                onDeleteComment={(comment: TaskComment) => onDeleteComment(task, comment.id)}
              />
            )}
            <div
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <CommentComposer
                expanded={expanded}
                onAddComment={(text) => onAddComment(task, text)}
              />
            </div>
          </div>
        </div>
        )}
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
