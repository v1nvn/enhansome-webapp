import { useMemo } from 'react'

import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'

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
    <div className="bg-background flex h-full flex-col">
      {/* Header with Search Bar */}
      <div className="bg-card/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchBar onTagsChange={onTagsChange} />
          </div>
          {total > 0 && (
            <div className="bg-muted/50 flex shrink-0 items-center gap-2 rounded-lg px-4 py-2">
              <span className="text-foreground text-sm font-semibold">
                {total.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm">items</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Grid with Scroll */}
      <div className="bg-muted/30 flex-1 overflow-y-auto p-6">
        <ItemsGrid items={allItems} sortBy={sortBy} />
      </div>

      {/* Pagination Controls */}
      {hasNextPage && (
        <div className="bg-card/80 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center justify-center">
            <button
              className="bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/30 group inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  <span className="bg-primary-foreground/20 ml-1 rounded-lg px-2 py-0.5 text-xs">
                    {allItems.length} / {total}
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
