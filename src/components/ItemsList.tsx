import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Calendar, Star } from 'lucide-react'
import type { RegistryItem } from '@/types/registry'

interface ItemsListProps {
  items: Array<RegistryItem>
  selectedItem: RegistryItem | null
  onItemSelect: (item: RegistryItem) => void
  sortBy: 'stars' | 'updated' | 'name'
}

export function ItemsList({
  items,
  selectedItem,
  onItemSelect,
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
  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
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
      ref={parentRef}
      className="h-full overflow-y-auto bg-slate-900/50"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = sortedItems[virtualRow.index]
          const isSelected = selectedItem?.title === item.title

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`mx-3 my-2 p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                }`}
                onClick={() => onItemSelect(item)}
              >
                {/* Title */}
                <h3 className="text-white font-semibold mb-2 line-clamp-1">
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Metadata */}
                {item.repo_info && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{item.repo_info.stars.toLocaleString()}</span>
                    </div>

                    {item.repo_info.language && (
                      <div className="px-2 py-0.5 bg-slate-700 rounded text-gray-300">
                        {item.repo_info.language}
                      </div>
                    )}

                    {item.repo_info.last_commit && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.repo_info.last_commit)}</span>
                      </div>
                    )}

                    {item.repo_info.archived && (
                      <div className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded">
                        Archived
                      </div>
                    )}
                  </div>
                )}

                {/* Children indicator */}
                {item.children && item.children.length > 0 && (
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
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>No items in this category</p>
        </div>
      )}
    </div>
  )
}
