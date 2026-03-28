import { Loader2 } from 'lucide-react'

import { cn } from '../../lib/utils/cn'

interface LoadingOverlayProps {
  children: React.ReactNode
  className?: string
  isLoading: boolean
  message?: string
}

export function LoadingOverlay({
  isLoading,
  message,
  className,
  children,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {message && (
              <p className="font-body text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
