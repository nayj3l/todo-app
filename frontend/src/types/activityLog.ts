export type ActivityLogStatus = 'success' | 'error'

export interface ActivityLogMeta {
  /** Primary entity, e.g. task or project name */
  subject?: string
  /** Previous value for change actions */
  from?: string
  /** New value for change actions */
  to?: string
  /** Extra one-line context */
  detail?: string
}

export interface ActivityLogEntry {
  id: string
  message: string
  status: ActivityLogStatus
  createdAt: string
  meta?: ActivityLogMeta
}

export interface ActivityLogInput {
  message: string
  status: ActivityLogStatus
  meta?: ActivityLogMeta
}
