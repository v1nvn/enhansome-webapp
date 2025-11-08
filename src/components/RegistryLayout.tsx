import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

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

interface SearchResult {
  data: (RegistryItem & { category: string; registry: string })[]
  hasMore: boolean
  offset: number
  total: number
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

  // Build base search params (without offset)
  const baseSearchParams = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQuery?.trim()) params.append('q', searchQuery.trim())
    if (selectedRegistry) params.append('registry', selectedRegistry)
    if (selectedLanguage) params.append('language', selectedLanguage)
    if (hideArchived) params.append('archived', 'false')
    if (minStars > 0) params.append('minStars', minStars.toString())
    params.append('sortBy', sortBy)
    return params.toString()
  }, [
    searchQuery,
    selectedRegistry,
    selectedLanguage,
    hideArchived,
    minStars,
    sortBy,
  ])

  // Build full search params with offset
  const searchParams = useMemo(() => {
    const params = new URLSearchParams(baseSearchParams)
    params.append('limit', PAGE_SIZE.toString())
    params.append('offset', offset.toString())
    return params.toString()
  }, [baseSearchParams, offset])

  // Fetch from search API
  const { data: searchResult, isFetching } = useQuery<SearchResult>({
    enabled: offset < pages.length * PAGE_SIZE || pages.length === 0,
    queryFn: async () => {
      const response = await fetch(`/api/search?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to search items')
      }
      return await response.json()
    },
    queryKey: ['search', searchParams],
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      <div className="border-b border-slate-700 bg-slate-800/50 p-4">
        <h2 className="text-xl font-bold text-white">{headerText}</h2>
        <p className="mt-1 text-sm text-gray-400">
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
        <div className="border-t border-slate-700 bg-slate-800/50 p-4">
          <button
            className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
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
