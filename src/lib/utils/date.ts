/**
 * Date utility functions
 */

export function formatDuration(
  startedAt: string,
  completedAt?: string,
): string {
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const diff = end - start

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0]
}

export function getDateWeeksAgo(weeks: number): string {
  const date = new Date()
  date.setDate(date.getDate() - weeks * 7)
  return date.toISOString().split('T')[0]
}
