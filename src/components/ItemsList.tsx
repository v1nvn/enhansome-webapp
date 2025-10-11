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
    <div className="h-full overflow-y-auto bg-slate-900/50" ref={parentRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const item = sortedItems[virtualRow.index]
          const isSelected = selectedItem?.title === item.title

          return (
            <div
              key={virtualRow.index}
              style={{
                height: `${virtualRow.size}px`,
                left: 0,
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                width: '100%',
              }}
            >
              <div
                className={`mx-3 my-2 cursor-pointer rounded-lg border p-4 transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-700/50'
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
                {/* Title */}
                <h3 className="mb-2 line-clamp-1 font-semibold text-white">
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                    {item.description}
                  </p>
                )}

                {/* Metadata */}
                {item.repo_info && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>{item.repo_info.stars.toLocaleString()}</span>
                    </div>

                    {item.repo_info.language && (
                      <div className="rounded bg-slate-700 px-2 py-0.5 text-gray-300">
                        {item.repo_info.language}
                      </div>
                    )}

                    {item.repo_info.last_commit && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.repo_info.last_commit)}</span>
                      </div>
                    )}

                    {item.repo_info.archived && (
                      <div className="rounded bg-orange-500/20 px-2 py-0.5 text-orange-300">
                        Archived
                      </div>
                    )}
                  </div>
                )}

                {item.children.length > 0 && (
                  <div className="mt-2 text-xs text-cyan-400">
                    +{item.children.length} sub-items
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {sortedItems.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-400">
          <p>No items in this category</p>
        </div>
      )}
    </div>
  )
}
