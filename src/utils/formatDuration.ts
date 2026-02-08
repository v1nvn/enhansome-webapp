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
