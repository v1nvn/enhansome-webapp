import { useMemo, useState } from 'react'

import { Link } from '@tanstack/react-router'
import { Archive } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

import { RichItemCard } from './RichItemCard'

interface ItemsGridProps {
  enableCompare?: boolean
  items: RegistryItem[]
  onCompareToggle?: (itemKey: string) => void
  selectedItems?: Set<string>
  sortBy: 'name' | 'quality' | 'stars' | 'updated'
}

export function ItemsGrid({
  items,
  sortBy,
  enableCompare = false,
  selectedItems: externalSelectedItems,
  onCompareToggle: externalOnToggle,
}: ItemsGridProps) {
  // Use internal state if not controlled externally
  const [internalSelectedItems, setInternalSelectedItems] = useState<
    Set<string>
  >(() => new Set())

  // Use external state if provided, otherwise use internal state
  const selectedItems = externalSelectedItems ?? internalSelectedItems

  // Sort items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'quality') {
        // Use pre-computed quality score
        const scoreA = (a as { qualityScore?: number }).qualityScore || 0
        const scoreB = (b as { qualityScore?: number }).qualityScore || 0
        return scoreB - scoreA
      }
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

  if (sortedItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-muted/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-sm">
            <Archive className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-foreground text-lg font-semibold">
            No repositories found
          </p>
          <p className="text-muted-foreground mb-6 mt-2 text-sm">
            Try adjusting your filters or search query
          </p>

          {/* Helpful suggestions */}
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              className="bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow"
              search={{ preset: 'trending' }}
              to="/registry"
            >
              View Trending
            </Link>
            <Link
              className="bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow"
              search={{ preset: 'popular' }}
              to="/registry"
            >
              View Popular
            </Link>
            <Link
              className="bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow"
              to="/"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getItemKey = (item: RegistryItem) =>
    `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`

  const toggleCompare = (itemKey: string) => {
    const handler =
      externalOnToggle ??
      ((key: string) => {
        setInternalSelectedItems(prev => {
          const next = new Set(prev)
          if (next.has(key)) {
            next.delete(key)
          } else if (next.size < 4) {
            next.add(key)
          }
          return next
        })
      })
    handler(itemKey)
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedItems.map(item => {
        const itemKey = getItemKey(item)
        return (
          <RichItemCard
            isCompareMode={enableCompare}
            isSelected={selectedItems.has(itemKey)}
            item={item}
            key={itemKey}
            onCompareToggle={
              enableCompare
                ? () => {
                    toggleCompare(itemKey)
                  }
                : undefined
            }
          />
        )
      })}
    </div>
  )
}
