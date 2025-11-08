import { useMemo, useRef } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import { Calendar, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface ItemsListProps {
  items: RegistryItem[]
  onItemSelect: (item: RegistryItem) => void
  selectedItem: null | RegistryItem
  sortBy: 'name' | 'stars' | 'updated'
}

export function ItemsList({
  items,
  onItemSelect,
  selectedItem,
  sortBy,
}: ItemsListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

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

  // Virtualize the list
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    estimateSize: () => 120, // Estimated row height
    getScrollElement: () => parentRef.current,
    overscan: 5,
  })

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
    <div
      className="h-full overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/50"
      ref={parentRef}
    >
      {sortedItems.length === 0 ? (
        <div className="flex h-full items-center justify-center text-slate-600 dark:text-gray-400">
          <p>No items found</p>
        </div>
      ) : (
        <div
          className="relative"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const item = sortedItems[virtualRow.index]
            const isSelected = selectedItem?.title === item.title

            return (
              <div
                className="absolute left-0 right-0"
                key={virtualRow.index}
                style={{
                  height: `${virtualRow.size}px`,
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={`mx-auto mb-3 max-w-5xl cursor-pointer rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600'
                  }`}
                  onClick={() => {
                    onItemSelect(item)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onItemSelect(item)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>

                      {/* Description */}
                      {item.description && (
                        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
                          {item.description}
                        </p>
                      )}

                      {/* Metadata */}
                      {item.repo_info && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-yellow-600 dark:text-yellow-400">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>{item.repo_info.stars.toLocaleString()}</span>
                          </div>

                          {item.repo_info.language && (
                            <div className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-700 dark:text-gray-300">
                              {item.repo_info.language}
                            </div>
                          )}

                          {item.repo_info.last_commit && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-gray-500">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {formatDate(item.repo_info.last_commit)}
                              </span>
                            </div>
                          )}

                          {item.repo_info.archived && (
                            <div className="rounded-md bg-orange-100 px-2.5 py-1 font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              Archived
                            </div>
                          )}

                          {item.children.length > 0 && (
                            <div className="rounded-md bg-cyan-100 px-2.5 py-1 font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                              +{item.children.length} sub-items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
