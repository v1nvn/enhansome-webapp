import { useMemo } from 'react'

import { Link } from '@tanstack/react-router'
import { Archive, Calendar, ExternalLink, Star, Users } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface ItemsGridProps {
  items: RegistryItem[]
  sortBy: 'name' | 'stars' | 'updated'
}

export function ItemsGrid({ items, sortBy }: ItemsGridProps) {
  // Sort items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'stars') {
        const starsA = a.repo_info?.stars || 0
        const starsB = b.repo_info?.stars || 0
        return starsB - starsA
      }
      if (sortBy === 'updated') {
        const dateA = a.repo_info?.last_commit || ''
        const dateB = b.repo_info?.last_commit || ''
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      }
      return a.title.localeCompare(b.title)
    })
  }, [items, sortBy])

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

  if (sortedItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Archive className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="font-display text-foreground text-lg font-semibold">
            No repositories found
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Try adjusting your filters or search query
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedItems.map(item => {
        // Generate link to repo detail page if owner and repo name exist
        const repoDetailLink =
          item.repo_info?.owner && item.repo_info.repo
            ? `/repo/${item.repo_info.owner}/${item.repo_info.repo}`
            : null

        return (
          <div
            className="border-border/60 bg-card/80 hover:border-primary/40 hover:shadow-primary/10 group/item relative flex flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            key={`${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`}
          >
            {/* Animated gradient accent */}
            <div className="from-primary/60 via-primary/40 to-accent/40 absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover/item:w-full" />

            {/* Hover gradient overlay */}
            <div className="from-primary/0 via-primary/5 to-primary/0 pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover/item:opacity-100" />

            {/* Title and Archive Badge */}
            <div className="relative mb-3">
              {repoDetailLink ? (
                <Link
                  className="font-display text-foreground group-hover/item:text-primary mb-2 line-clamp-2 block text-lg font-semibold leading-tight transition-colors duration-200"
                  to={repoDetailLink}
                >
                  {item.title}
                </Link>
              ) : (
                <h3 className="font-display text-foreground group-hover/item:text-primary mb-2 line-clamp-2 text-lg font-semibold leading-tight transition-colors duration-200">
                  {item.title}
                </h3>
              )}
              <div className="flex items-center gap-2">
                {item.repo_info?.archived && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                )}
                {item.children.length > 0 && (
                  <span className="bg-accent/30 text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                    <Users className="h-3 w-3" />+{item.children.length}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground/80 relative mb-4 line-clamp-2 flex-1 text-sm leading-relaxed">
              {item.description ?? ''}
            </p>

            {/* Metadata */}
            {item.repo_info && (
              <div className="relative space-y-3">
                {/* Stars and Language */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{item.repo_info.stars.toLocaleString()}</span>
                  </div>
                  {item.repo_info.language && (
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      {item.repo_info.language}
                    </span>
                  )}
                </div>

                {/* Last Updated */}
                {item.repo_info.last_commit && (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(item.repo_info.last_commit)}</span>
                  </div>
                )}

                {/* Enhanced Action Buttons */}
                <div className="flex gap-2">
                  {repoDetailLink && (
                    <Link
                      className="bg-muted/80 hover:bg-muted text-foreground hover:border-primary/30 border-border flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95"
                      to={repoDetailLink}
                    >
                      <span>Details</span>
                    </Link>
                  )}
                  <a
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 shadow-primary/10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold shadow-sm transition-all duration-200 active:scale-95"
                    href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
