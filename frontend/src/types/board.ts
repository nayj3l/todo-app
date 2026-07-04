import type { TaskPriority } from './priority'

export interface TaskComment {
  id: number
  taskId: number
  text: string
  createdAt: string
}

export interface TaskGroup {
  id: number
  name: string
  color: string
  sortOrder: number
  taskCount: number
}

export interface Task {
  id: number
  title: string
  description: string | null
  done: boolean
  groupId: number | null
  sortOrder: number
  priority: TaskPriority
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  comments?: TaskComment[]
}

export interface Board {
  groups: TaskGroup[]
  tasks: Task[]
}

export interface RecycleBin {
  tasks: Task[]
}

export interface TaskReorderItem {
  taskId: number
  groupId: number | null
  sortOrder: number
}

export type ActiveView = number | 'all' | 'recycle' | 'settings'

export type { TaskPriority } from './priority'
