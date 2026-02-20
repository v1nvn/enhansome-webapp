import { useEffect } from 'react'

import { Link } from '@tanstack/react-router'
import { Calendar, ExternalLink, RotateCcw, Star, X } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

import { BestForTag } from './BestForTag'
import { ComplexityBadge } from './ComplexityBadge'

interface CompareDrawerProps {
  items: RegistryItem[]
  onClearAll: () => void
  onClose: () => void
  onRemove: (itemKey: string) => void
  open: boolean
}

export function CompareDrawer({
  items,
  open,
  onClose,
  onRemove,
  onClearAll,
}: CompareDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || items.length === 0) return null

  const getItemKey = (item: RegistryItem) =>
    `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="bg-background/60 fixed inset-0 z-40 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
        tabIndex={-1}
      />

      {/* Drawer - Desktop: right side panel, Mobile: full screen modal */}
      <div className="bg-card fixed bottom-0 right-0 z-50 flex h-full w-full flex-col shadow-2xl md:h-screen md:w-[600px] lg:w-[800px]">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <h2 className="font-display text-xl font-semibold">
            Compare {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              onClick={onClearAll}
              type="button"
            >
              <RotateCcw className="mr-1 inline h-4 w-4" />
              Clear All
            </button>
            <button
              aria-label="Close"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Comparison Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {items.map(item => {
              const itemKey = getItemKey(item)
              const repoDetailLink =
                item.repo_info?.owner && item.repo_info.repo
                  ? `/repo/${item.repo_info.owner}/${item.repo_info.repo}`
                  : null

              return (
                <div
                  className="border-border bg-muted/20 rounded-lg border p-4"
                  key={itemKey}
                >
                  {/* Remove button */}
                  <div className="mb-3 flex justify-end">
                    <button
                      aria-label={`Remove ${item.title}`}
                      className="text-muted-foreground hover:bg-muted hover:text-destructive rounded-full p-1.5 transition-colors"
                      onClick={() => {
                        onRemove(itemKey)
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Title */}
                  {repoDetailLink ? (
                    <Link
                      className="font-display text-foreground hover:text-primary block text-lg font-semibold leading-tight transition-colors"
                      onClick={onClose}
                      to={repoDetailLink}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <h3 className="font-display text-foreground text-lg font-semibold leading-tight">
                      {item.title}
                    </h3>
                  )}

                  {/* Metadata Grid */}
                  <div className="mt-4 space-y-3">
                    {/* Stars */}
                    {item.repo_info?.stars !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Stars
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="font-mono text-sm">
                            {item.repo_info.stars.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Language */}
                    {item.repo_info?.language && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Language
                        </span>
                        <span className="rounded-sm bg-indigo-100 px-2 py-0.5 font-mono text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {item.repo_info.language}
                        </span>
                      </div>
                    )}

                    {/* Last Updated */}
                    {item.repo_info?.last_commit && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Updated
                        </span>
                        <div className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.repo_info.last_commit)}</span>
                        </div>
                      </div>
                    )}

                    {/* License */}
                    {item.license && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          License
                        </span>
                        <span className="font-mono text-xs">
                          {item.license}
                        </span>
                      </div>
                    )}

                    {/* Complexity */}
                    {item.complexity && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Complexity
                        </span>
                        <ComplexityBadge complexity={item.complexity} />
                      </div>
                    )}

                    {/* Bundle Size */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-semibold uppercase">
                        Bundle Size
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {item.bundle_size
                          ? `${(item.bundle_size / 1024).toFixed(1)} KB`
                          : 'N/A'}
                      </span>
                    </div>

                    {/* Best For Tags */}
                    {item.best_for_tags && item.best_for_tags.length > 0 && (
                      <div className="pt-2">
                        <BestForTag tags={item.best_for_tags} />
                      </div>
                    )}

                    {/* Pros/Cons Section (placeholder) */}
                    <div className="border-border/50 mt-4 space-y-2 border-t pt-4">
                      <div>
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Pros
                        </span>
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          Community feedback pending
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Cons
                        </span>
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          Community feedback pending
                        </p>
                      </div>
                    </div>

                    {/* GitHub Link */}
                    {item.repo_info?.owner && item.repo_info.repo && (
                      <div className="pt-3">
                        <a
                          className="bg-muted hover:bg-muted/80 text-foreground inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-xs font-semibold transition-all"
                          href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span>View on GitHub</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty slots indicator */}
          {items.length < 4 && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                You can compare up to {4 - items.length} more{' '}
                {4 - items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
