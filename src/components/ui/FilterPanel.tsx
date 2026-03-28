import { type ReactNode } from 'react'

import { X } from 'lucide-react'

interface FilterPanelProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function FilterPanel({
  children,
  isOpen,
  onClose,
  title = 'Filters',
}: FilterPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close filter panel"
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border/30 bg-background px-4 py-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </>
  )
}
