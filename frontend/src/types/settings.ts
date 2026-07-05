export type BoardView = 'list' | 'columns'

export interface AppSettings {
  doubleClickRename: boolean
  showProjectTaskBreakdown: boolean
  showProjectProgressBar: boolean
  boardView: BoardView
  wrapTaskTitles: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  doubleClickRename: false,
  showProjectTaskBreakdown: false,
  showProjectProgressBar: false,
  boardView: 'list',
  wrapTaskTitles: false,
}
