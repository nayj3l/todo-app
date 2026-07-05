import type { TaskGroup } from '../types/board'

interface ProjectGroupDragPreviewProps {
  group: TaskGroup
  columnLayout: boolean
}

export default function ProjectGroupDragPreview({ group, columnLayout }: ProjectGroupDragPreviewProps) {
  const taskLabel = `${group.taskCount} task${group.taskCount === 1 ? '' : 's'}`

  if (columnLayout) {
    return (
      <div className="flex h-[min(420px,55vh)] w-[min(320px,88vw)] shrink-0 flex-col rounded-2xl border border-surface-border bg-[#FAFAFB] p-3 shadow-xl">
        <div className="flex items-center gap-3 rounded-xl px-1 py-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-surface-text">{group.name}</span>
          <span className="shrink-0 rounded-full bg-[#F3F3F6] px-3 py-1 text-[11px] font-medium tabular-nums text-[#9A9AA8]">
            {taskLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-surface-text">{group.name}</span>
        <span className="shrink-0 rounded-full bg-[#F3F3F6] px-3 py-1 text-[11px] font-medium tabular-nums text-[#9A9AA8]">
          {taskLabel}
        </span>
      </div>
    </div>
  )
}
