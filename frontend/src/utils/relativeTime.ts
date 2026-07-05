function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatRelativeTime(value: string | Date, now = new Date()): string {
  const date = toDate(value)
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffSec < 60) {
    return `${diffSec}s`
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return `${diffMin}m`
  }

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) {
    return `${diffHour}h`
  }

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) {
    return `${diffDay}d`
  }

  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 5) {
    return `${diffWeek}w`
  }

  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) {
    return `${diffMonth}mo`
  }

  const diffYear = Math.floor(diffDay / 365)
  return `${diffYear}y`
}

/** Full timestamp for hover, e.g. "July 2 5:14pm" */
export function formatCommentSnapshot(value: string | Date): string {
  const date = toDate(value)
  const month = date.toLocaleDateString(undefined, { month: 'long' })
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const hour12 = hours % 12 || 12
  const period = hours < 12 ? 'am' : 'pm'

  return `${month} ${day} ${hour12}:${minutes}${period}`
}
