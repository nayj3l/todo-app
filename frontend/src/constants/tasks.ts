export const DEFAULT_TASK_TITLE = 'New task'

/** Defer success toast until auto-edit title has taken focus (toast re-render can steal it). */
export const TASK_CREATE_TOAST_DELAY_MS = 450

/** Ignore accidental blur briefly while auto-edit input mounts. */
export const AUTO_EDIT_BLUR_GRACE_MS = 300

/** Keep reclaiming title focus through toast mount/update. */
export const AUTO_EDIT_FOCUS_KEEPALIVE_MS = [0, 50, 120, 200, 350, 500, 650] as const
