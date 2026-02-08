import { useEffect, useState } from 'react'

export function formatRelativeTime(date: string, currentTime: number): string {
  const diff = currentTime - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return currentTime
}
