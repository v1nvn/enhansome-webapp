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
      <button
        aria-label="Close comparison"
        className="bg-background/60 duration-250 fixed inset-0 z-40 cursor-pointer backdrop-blur-sm transition-opacity"
        onClick={onClose}
        type="button"
      />

      {/* Drawer Panel */}
      <div className="bg-card fixed bottom-0 right-0 z-50 h-full w-full shadow-2xl transition-transform duration-300 ease-out md:h-screen md:w-[600px] lg:w-[800px]">
        {/* Header */}
        <div className="border-border/50 flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold">Comparison</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl px-4 py-2 text-sm font-medium transition-all"
              onClick={onClearAll}
              type="button"
            >
              <RotateCcw className="mr-1.5 inline h-4 w-4" />
              Clear
            </button>
            <button
              aria-label="Close"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl p-2.5 transition-all"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {items.map(item => {
              const itemKey = getItemKey(item)
              const repoDetailLink =
                item.repo_info?.owner && item.repo_info.repo
                  ? `/repo/${item.repo_info.owner}/${item.repo_info.repo}`
                  : null

              return (
                <div className="bg-muted/20 rounded-2xl p-5" key={itemKey}>
                  {/* Header with remove button */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                      {item.description && (
                        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <button
                      aria-label={`Remove ${item.title}`}
                      className="text-muted-foreground hover:bg-muted hover:text-destructive flex-shrink-0 rounded-xl p-2 transition-all"
                      onClick={() => {
                        onRemove(itemKey)
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3">
                    {/* Stars */}
                    {item.repo_info?.stars !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Stars
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-mono text-sm">
                            {item.repo_info.stars.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Language */}
                    {item.repo_info?.language && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Language
                        </span>
                        <span className="rounded-lg bg-indigo-100/80 px-2.5 py-1 font-mono text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {item.repo_info.language}
                        </span>
                      </div>
                    )}

                    {/* Last Updated */}
                    {item.repo_info?.last_commit && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Updated
                        </span>
                        <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(item.repo_info.last_commit)}</span>
                        </div>
                      </div>
                    )}

                    {/* License */}
                    {item.license && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          License
                        </span>
                        <span className="font-mono text-xs">
                          {item.license}
                        </span>
                      </div>
                    )}

                    {/* Complexity */}
                    {item.complexity && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Complexity
                        </span>
                        <ComplexityBadge complexity={item.complexity} />
                      </div>
                    )}

                    {/* Bundle Size */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
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

                    {/* GitHub Link */}
                    {item.repo_info?.owner && item.repo_info.repo && (
                      <div className="pt-3">
                        <a
                          className="bg-muted hover:bg-muted/80 text-foreground border-border/30 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
                          href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span>View on GitHub</span>
                          <ExternalLink className="h-3.5 w-3.5" />
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
            <div className="bg-muted/10 mt-8 rounded-2xl p-6 text-center">
              <p className="text-muted-foreground text-sm">
                You can compare up to{' '}
                <span className="text-foreground font-semibold">
                  {4 - items.length}
                </span>{' '}
                more {4 - items.length === 1 ? 'item' : 'items'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Select items from the grid to add them to comparison
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
