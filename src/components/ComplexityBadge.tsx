import { Signal } from 'lucide-react'

interface ComplexityBadgeProps {
  className?: string
  complexity?: 'high' | 'low' | 'medium'
}

const complexityConfig = {
  low: {
    label: 'Low',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
    bars: 1,
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950/50',
    bars: 2,
  },
  high: {
    label: 'High',
    color: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/50',
    bars: 3,
  },
}

export function ComplexityBadge({
  complexity,
  className = '',
}: ComplexityBadgeProps) {
  if (!complexity) return null

  const config = complexityConfig[complexity]

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 ${config.bgColor} ${config.color} ${className}`}
    >
      <Signal className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}
