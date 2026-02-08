import { CheckCircle, Clock, Loader2, X } from 'lucide-react'

interface IndexingStatusIconProps {
  current?: null | {
    status?: 'completed' | 'failed' | 'running' | null
  }
  isRunning: boolean
}

export function IndexingStatusIcon({
  isRunning,
  current,
}: IndexingStatusIconProps) {
  if (isRunning && current) {
    return (
      <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }
  if (current?.status === 'completed') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-600">
        <CheckCircle className="h-4 w-4" />
      </div>
    )
  }
  if (current?.status === 'failed') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-600">
        <X className="h-4 w-4" />
      </div>
    )
  }
  return (
    <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full">
      <Clock className="h-4 w-4" />
    </div>
  )
}
