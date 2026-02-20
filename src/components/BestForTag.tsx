import { Flame } from 'lucide-react'

interface BestForTagProps {
  className?: string
  tags: string[]
}

export function BestForTag({ tags, className = '' }: BestForTagProps) {
  if (tags.length === 0) return null

  return (
    <div
      className={`bg-accent/30 border-border flex items-start gap-1.5 rounded-sm border px-2.5 py-1.5 ${className}`}
    >
      <Flame className="text-primary h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-foreground text-xs font-medium">
        Best for: {tags.join(', ')}
      </span>
    </div>
  )
}
