import { useMemo, useState } from 'react'

import { useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Loader2 } from 'lucide-react'

import type { FilterValues } from '@/components/SearchFilters'
import type { FilterPreset } from '@/lib/filter-presets'
import type { RegistryItem } from '@/types/registry'

import { CompareDrawer } from '@/components/CompareDrawer'
import {
  EnhancedSearchBar,
  type EnhancedSearchBarFilters,
} from '@/components/EnhancedSearchBar'
import { FloatingCompareButton } from '@/components/FloatingCompareButton'
import { ItemsGrid } from '@/components/ItemsGrid'
import { SearchFilters } from '@/components/SearchFilters'
import {
  metadataQueryOptions,
  searchInfiniteQueryOptions,
} from '@/lib/server-functions'

const PAGE_SIZE = 20

interface RegistrySearch {
  lang?: string
  preset?: FilterPreset
  q?: string
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    lang: search.lang as string | undefined,
    preset: search.preset as FilterPreset | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort:
      (search.sort as 'name' | 'quality' | 'stars' | 'updated' | undefined) ||
      'quality',
  }),
  loaderDeps: ({ search }) => ({
    registry: search.registry,
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(metadataQueryOptions())
  },
  pendingComponent: () => (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="flex flex-1">
        <div className="border-border bg-card hidden w-72 border-r p-6 md:block">
          <div className="bg-muted animate-shimmer h-6 w-20 rounded" />
          <div className="mt-4 space-y-2">
            <div className="bg-muted animate-shimmer h-10 w-full rounded-lg" />
            <div className="bg-muted animate-shimmer h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="bg-muted/30 flex flex-1 flex-col p-6">
          <div className="bg-muted animate-shimmer h-12 w-full max-w-2xl rounded-lg" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                className="bg-card animate-shimmer h-56 rounded-lg"
                key={`skeleton-${i}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
})

function RegistryBrowser() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // Fetch registry metadata
  useSuspenseQuery(metadataQueryOptions())

  // Filters
  const currentFilters = useMemo((): FilterValues => {
    return {
      lang: search.lang,
      preset: search.preset,
      registry: search.registry,
      sort: search.sort || 'quality',
    }
  }, [search])

  // Update URL when filters change
  const handleFiltersChange = (filters: FilterValues) => {
    const newSearch: RegistrySearch = {
      ...search,
      lang: filters.lang,
      preset: filters.preset,
      registry: filters.registry,
      sort: filters.sort || 'quality',
    }

    void navigate({ search: newSearch })
  }

  // For EnhancedSearchBar
  const handleEnhancedFiltersChange = (filters: EnhancedSearchBarFilters) => {
    const newSearch: RegistrySearch = {
      ...search,
      lang: filters.lang,
      preset: filters.preset,
      registry: filters.registry,
      sort: filters.sort || 'quality',
    }

    void navigate({ search: newSearch })
  }

  const currentEnhancedFilters = useMemo((): EnhancedSearchBarFilters => {
    return {
      lang: search.lang,
      preset: search.preset,
      registry: search.registry,
      sort: search.sort || 'quality',
    }
  }, [search])

  // Build search params object
  const searchParams = useMemo(
    () => ({
      language: search.lang,
      limit: PAGE_SIZE,
      preset: search.preset,
      q: search.q?.trim(),
      registryName: search.registry,
      sortBy: search.sort || 'quality',
    }),
    [search],
  )

  // Fetch from search API using infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(searchInfiniteQueryOptions(searchParams))

  // Combine all pages
  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? []
  }, [data?.pages])

  const total = data?.pages[data.pages.length - 1]?.total ?? 0

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Filters Sidebar (Desktop Only) */}
        <SearchFilters
          onFiltersChange={handleFiltersChange}
          selectedFilters={currentFilters}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <RegistryBrowserContent
            allItems={allItems}
            currentFilters={currentEnhancedFilters}
            fetchNextPage={fetchNextPage}
            handleFiltersChange={handleEnhancedFiltersChange}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            searchQuery={search.q}
            sortBy={search.sort || 'stars'}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}

function RegistryBrowserContent({
  allItems,
  currentFilters,
  fetchNextPage,
  handleFiltersChange,
  hasNextPage,
  isFetchingNextPage,
  searchQuery,
  sortBy,
  total,
}: {
  allItems: RegistryItem[]
  currentFilters: EnhancedSearchBarFilters
  fetchNextPage: () => Promise<unknown>
  handleFiltersChange: (filters: EnhancedSearchBarFilters) => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  searchQuery?: string
  sortBy: 'name' | 'quality' | 'stars' | 'updated'
  total: number
}) {
  // Compare mode state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(),
  )
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  // Get the actual item objects for selected items
  const selectedItemObjects = useMemo(() => {
    return allItems.filter(item => {
      const itemKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`
      return selectedItems.has(itemKey)
    })
  }, [allItems, selectedItems])

  const handleToggleCompare = (itemKey: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemKey)) {
        next.delete(itemKey)
      } else if (next.size < 4) {
        next.add(itemKey)
      }
      return next
    })
  }

  const handleRemoveFromCompare = (itemKey: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.delete(itemKey)
      return next
    })
  }

  const handleClearAll = () => {
    setSelectedItems(new Set())
    setIsCompareOpen(false)
  }

  const handleLoadMore = () => {
    void fetchNextPage()
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Search Bar with Presets */}
      <div className="bg-card/80 border-border border-b px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto max-w-2xl">
          <EnhancedSearchBar
            defaultValue={searchQuery}
            enableIntentDetection={true}
            filters={currentFilters}
            onFiltersChange={handleFiltersChange}
            placeholder="Search repositories..."
            resultsCount={total}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-muted/30 flex-1 overflow-y-auto p-4 sm:p-6">
        <ItemsGrid
          enableCompare={true}
          items={allItems}
          onCompareToggle={handleToggleCompare}
          selectedItems={selectedItems}
          sortBy={sortBy}
        />
      </div>

      {/* Floating Compare Button */}
      <FloatingCompareButton
        count={selectedItems.size}
        onClick={() => {
          setIsCompareOpen(true)
        }}
      />

      {/* Compare Drawer */}
      <CompareDrawer
        items={selectedItemObjects}
        onClearAll={handleClearAll}
        onClose={() => {
          setIsCompareOpen(false)
        }}
        onRemove={handleRemoveFromCompare}
        open={isCompareOpen}
      />

      {/* Pagination Controls */}
      {hasNextPage && (
        <div className="bg-card/80 border-border border-t px-4 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center justify-center">
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isFetchingNextPage}
              onClick={handleLoadMore}
              type="button"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                <>
                  <span>Load More</span>
                  <ChevronDown className="ml-2 inline h-4 w-4" />
                  <span className="bg-primary-foreground/20 ml-2 rounded-lg px-2 py-0.5 text-xs">
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
