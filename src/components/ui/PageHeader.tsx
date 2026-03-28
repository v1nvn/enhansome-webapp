import { type ReactNode } from 'react'

import { cn } from '../../lib/utils/cn'

interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description?: string
  metadata?: ReactNode
  title: string
}

export function PageHeader({
  title,
  description,
  metadata,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
          {metadata != null && (
            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
              {metadata}
            </div>
          )}
        </div>

        {actions != null && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
