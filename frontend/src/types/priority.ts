export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface PriorityOption {
  value: TaskPriority
  label: string
  color: string
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'NONE', label: 'None', color: '#9CA3AF' },
  { value: 'LOW', label: 'Low', color: '#3B82F6' },
  { value: 'MEDIUM', label: 'Medium', color: '#EAB308' },
  { value: 'HIGH', label: 'High', color: '#F97316' },
  { value: 'URGENT', label: 'Urgent', color: '#EF4444' },
]

export function getPriorityOption(priority: TaskPriority): PriorityOption {
  return PRIORITY_OPTIONS.find((option) => option.value === priority) ?? PRIORITY_OPTIONS[0]
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getPriorityBorderColor(priority: TaskPriority): string {
  const option = getPriorityOption(priority)
  if (option.value === 'NONE') {
    return ''
  }
  return hexToRgba(option.color, 0.32)
}
