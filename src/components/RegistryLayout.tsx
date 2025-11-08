import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import type { SearchResult } from '@/lib/server-functions'

import { searchQueryOptions } from '@/lib/server-functions'

import { ItemsList } from './ItemsList'

interface RegistryLayoutProps {
  hideArchived?: boolean
  minStars?: number
  searchQuery?: string
  selectedCategory?: string
  selectedLanguage?: string
  selectedRegistry?: string
  sortBy: 'name' | 'stars' | 'updated'
}

const PAGE_SIZE = 100

export function RegistryLayout({
  hideArchived = false,
  minStars = 0,
  searchQuery,
  selectedCategory,
  selectedLanguage,
  selectedRegistry,
  sortBy,
}: RegistryLayoutProps) {
  const [offset, setOffset] = useState(0)
  const [pages, setPages] = useState<SearchResult[]>([])

  // Build search params object
  const searchParams = useMemo(
    () => ({
      archived: hideArchived ? false : undefined,
      language: selectedLanguage,
      limit: PAGE_SIZE,
      minStars: minStars > 0 ? minStars : undefined,
      offset,
      q: searchQuery?.trim(),
      registryName: selectedRegistry,
      sortBy,
    }),
    [
      searchQuery,
      selectedRegistry,
      selectedLanguage,
      hideArchived,
      minStars,
      sortBy,
      offset,
    ],
  )

  // Build base search params (without offset) for reset detection
  const baseSearchParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { offset: _, ...base } = searchParams
    return JSON.stringify(base)
  }, [searchParams])

  // Fetch from search API
  const { data: searchResult, isFetching } = useQuery({
    ...searchQueryOptions(searchParams),
    enabled: offset < pages.length * PAGE_SIZE || pages.length === 0,
  })

  // Reset pages when base params change
  useEffect(() => {
    setOffset(0)
    setPages([])
  }, [baseSearchParams])

  // Add new page to pages array when data arrives
  useEffect(() => {
    if (searchResult && !pages.find(p => p.offset === searchResult.offset)) {
      setPages(prev => [...prev, searchResult])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResult])

  // Combine all pages
  const allItems = useMemo(() => {
    return pages.flatMap(page => page.data)
  }, [pages])

  const hasMore = pages.length > 0 ? pages[pages.length - 1]?.hasMore : false
  const total = pages.length > 0 ? pages[pages.length - 1]?.total : 0

  // Apply category filter (client-side only for category)
  const filteredItems = useMemo(() => {
    if (!selectedCategory) {
      return allItems
    }

    const [registry, categoryName] = selectedCategory.split('::')
    return allItems.filter(
      item => item.registry === registry && item.category === categoryName,
    )
  }, [allItems, selectedCategory])

  const handleLoadMore = () => {
    setOffset(prev => prev + PAGE_SIZE)
  }

  // Get header text
  const headerText = useMemo(() => {
    if (selectedCategory) {
      const [, categoryName] = selectedCategory.split('::')
      return categoryName
    }
    if (selectedRegistry) {
      return selectedRegistry
    }
    return 'All Items'
  }, [selectedCategory, selectedRegistry])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{headerText}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          {filteredItems.length} of {total} items
        </p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden">
        <ItemsList
          items={filteredItems}
          onItemSelect={() => {
            // TODO: Open modal or navigate to detail page
          }}
          selectedItem={null}
          sortBy={sortBy}
        />
      </div>

      {/* Load More Button */}
      {!selectedCategory && hasMore && (
        <div className="border-t border-slate-200 bg-white/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-700"
            disabled={isFetching}
            onClick={handleLoadMore}
            type="button"
          >
            {isFetching ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </span>
            ) : (
              `Load More (${allItems.length} of ${total})`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
