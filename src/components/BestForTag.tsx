import { Flame } from 'lucide-react'

interface BestForTagProps {
  className?: string
  tags: string[]
}

export function BestForTag({ tags, className = '' }: BestForTagProps) {
  if (tags.length === 0) return null

  return (
    <div
      className={`flex items-start gap-1.5 rounded-lg bg-gradient-to-r from-accent/20 to-accent/10 px-2.5 py-1.5 ${className}`}
    >
      <Flame className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      <span className="text-xs font-medium text-foreground">
        Best for: {tags.join(', ')}
      </span>
    </div>
  )
}
