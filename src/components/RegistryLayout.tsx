import { useMemo } from 'react'

import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { searchInfiniteQueryOptions } from '@/lib/server-functions'

import { ItemsGrid } from './ItemsGrid'
import { SearchBar, type SearchTag } from './SearchBar'

interface RegistryLayoutProps {
  dateFrom?: string
  dateTo?: string
  hideArchived?: boolean
  maxStars?: number
  minStars?: number
  onTagsChange: (tags: SearchTag[]) => void
  searchQuery?: string
  selectedCategory?: string
  selectedLanguage?: string
  selectedRegistry?: string
  sortBy: 'name' | 'stars' | 'updated'
}

const PAGE_SIZE = 20

export function RegistryLayout({
  dateFrom,
  dateTo,
  hideArchived = false,
  maxStars,
  minStars = 0,
  onTagsChange,
  searchQuery,
  selectedCategory,
  selectedLanguage,
  selectedRegistry,
  sortBy,
}: RegistryLayoutProps) {
  // Extract category name from the key (format: "registry::category")
  const categoryName = useMemo(() => {
    if (!selectedCategory) return undefined
    const [, category] = selectedCategory.split('::')
    return category
  }, [selectedCategory])

  // Build search params object (without cursor)
  const searchParams = useMemo(
    () => ({
      archived: hideArchived ? false : undefined,
      category: categoryName,
      dateFrom,
      dateTo,
      language: selectedLanguage,
      limit: PAGE_SIZE,
      maxStars: maxStars && maxStars > 0 ? maxStars : undefined,
      minStars: minStars > 0 ? minStars : undefined,
      q: searchQuery?.trim(),
      registryName: selectedRegistry,
      sortBy,
    }),
    [
      searchQuery,
      selectedRegistry,
      categoryName,
      selectedLanguage,
      hideArchived,
      minStars,
      maxStars,
      dateFrom,
      dateTo,
      sortBy,
    ],
  )

  // Fetch from search API using infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(searchInfiniteQueryOptions(searchParams))

  // Combine all pages - no client-side filtering!
  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? []
  }, [data?.pages])

  const total = data?.pages[data.pages.length - 1]?.total ?? 0

  const handleLoadMore = () => {
    void fetchNextPage()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with Search Bar in Single Row */}
      <div className="bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          {/* <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">
            {headerText}
          </h2> */}
          <div className="flex-1">
            <SearchBar onTagsChange={onTagsChange} />
          </div>
          <p className="whitespace-nowrap text-sm text-slate-500">
            {total > 0 && <>{total.toLocaleString()} items</>}
          </p>
        </div>
      </div>

      {/* Items Grid with Scroll */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        <ItemsGrid items={allItems} sortBy={sortBy} />
      </div>

      {/* Pagination Controls */}
      {hasNextPage && (
        <div className="bg-white px-6 py-4">
          <div className="flex items-center justify-center">
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isFetchingNextPage}
              onClick={handleLoadMore}
              type="button"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Load More</span>
                  <span className="text-indigo-200">
                    ({allItems.length} / {total})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
