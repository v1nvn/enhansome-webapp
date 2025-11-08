import { useMemo } from 'react'

import { Calendar, ExternalLink, Star } from 'lucide-react'

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
      <div className="flex h-full items-center justify-center text-slate-500">
        <p>No results found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedItems.map(item => (
        <div
          className="group relative flex flex-col rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg"
          key={`${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`}
        >
          {/* Title and Archive Badge */}
          <div className="mb-3">
            <h3 className="mb-2 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-indigo-600">
              {item.title}
            </h3>
            {item.repo_info?.archived && (
              <span className="inline-block rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Archived
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="mb-4 line-clamp-2 flex-1 text-sm text-slate-600">
              {item.description}
            </p>
          )}

          {/* Metadata */}
          {item.repo_info && (
            <div className="space-y-3">
              {/* Stars and Language */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{item.repo_info.stars.toLocaleString()}</span>
                </div>
                {item.repo_info.language && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                    {item.repo_info.language}
                  </span>
                )}
              </div>

              {/* Last Updated */}
              {item.repo_info.last_commit && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(item.repo_info.last_commit)}</span>
                </div>
              )}

              {/* Sub-items Badge */}
              {item.children.length > 0 && (
                <div className="text-xs font-medium text-indigo-600">
                  +{item.children.length} sub-items
                </div>
              )}

              {/* Link Button */}
              <a
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
