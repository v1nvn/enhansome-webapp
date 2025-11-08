import { useMemo } from 'react'

import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { searchInfiniteQueryOptions } from '@/lib/server-functions'

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

const PAGE_SIZE = 20

export function RegistryLayout({
  hideArchived = false,
  minStars = 0,
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
      language: selectedLanguage,
      limit: PAGE_SIZE,
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

  // Calculate pagination info
  const currentPage = data?.pages.length ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleLoadMore = () => {
    void fetchNextPage()
  }

  // Get header text
  const headerText = useMemo(() => {
    if (categoryName) {
      return categoryName
    }
    if (selectedRegistry) {
      return selectedRegistry
    }
    return 'All Items'
  }, [categoryName, selectedRegistry])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {headerText}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          Showing {allItems.length} of {total} items
        </p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden">
        <ItemsList
          items={allItems}
          onItemSelect={() => {
            // TODO: Open modal or navigate to detail page
          }}
          selectedItem={null}
          sortBy={sortBy}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="border-t border-slate-200 bg-white/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <span className="text-sm text-slate-500 dark:text-gray-500">
                • {allItems.length} loaded of {total} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasNextPage && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-700"
                  disabled={isFetchingNextPage}
                  onClick={handleLoadMore}
                  type="button"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Next Page
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M9 5l7 7-7 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </>
                  )}
                </button>
              )}
              {!hasNextPage && currentPage > 0 && (
                <span className="text-sm text-slate-500 dark:text-gray-500">
                  No more items
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
