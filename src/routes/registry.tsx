import { useMemo, useState } from 'react'

import { useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Loader2 } from 'lucide-react'

import type { FilterValues } from '@/components/FiltersSidebar'
import type { SearchTag } from '@/components/SearchBar'

import ActiveFilterChips from '@/components/ActiveFilterChips'
import { FacetedSearchBar } from '@/components/FacetedSearchBar'
import FiltersBottomSheet from '@/components/FiltersBottomSheet'
import { FiltersSidebar } from '@/components/FiltersSidebar'
import { ItemsGrid } from '@/components/ItemsGrid'
import MobileFilterButton from '@/components/MobileFilterButton'
import {
  categoriesQueryOptions,
  metadataQueryOptions,
  searchInfiniteQueryOptions,
} from '@/lib/server-functions'

const PAGE_SIZE = 20

interface RegistrySearch {
  archived?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  lang?: string
  q?: string
  registry?: string
  sort?: 'name' | 'stars' | 'updated'
  starsMax?: string
  starsMin?: string
}

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    archived: search.archived as string | undefined,
    category: search.category as string | undefined,
    dateFrom: search.dateFrom as string | undefined,
    dateTo: search.dateTo as string | undefined,
    lang: search.lang as string | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort: (search.sort as 'name' | 'stars' | 'updated' | undefined) || 'stars',
    starsMax: search.starsMax as string | undefined,
    starsMin: search.starsMin as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    registry: search.registry,
  }),
  loader: async ({ context, deps }) => {
    // Preload metadata and registry-specific categories
    // This ensures all data is ready before component renders (SWR pattern)
    await Promise.all([
      context.queryClient.ensureQueryData(metadataQueryOptions()),
      context.queryClient.ensureQueryData(
        categoriesQueryOptions(deps.registry),
      ),
    ])
  },
  pendingComponent: () => (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Main Content Skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton (Desktop Only) */}
        <div className="border-border bg-card hidden w-80 border-r p-6 md:block">
          <div className="space-y-4">
            <div className="bg-muted h-6 w-24 animate-pulse rounded" />
            <div className="space-y-2">
              <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
              <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
              <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-muted/30 flex flex-1 flex-col overflow-hidden">
          {/* Header Skeleton */}
          <div className="border-border bg-card/80 border-b px-6 py-4 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="bg-muted h-10 flex-1 animate-pulse rounded-lg" />
              <div className="bg-muted h-8 w-20 animate-pulse rounded-lg" />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="flex-1 overflow-hidden p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  className="bg-card h-56 animate-pulse rounded-2xl"
                  key={`skeleton-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Button Skeleton */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <div className="bg-muted h-14 w-14 animate-pulse rounded-2xl" />
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

  // Mobile bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  // Fetch registry metadata for registry names
  const { data: registryMetadata } = useSuspenseQuery(metadataQueryOptions())

  const registryNames = useMemo(() => {
    return registryMetadata.map(r => r.name)
  }, [registryMetadata])

  // Filters for the sidebar
  const currentFilters = useMemo((): FilterValues => {
    return {
      archived: search.archived,
      category: search.category,
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      lang: search.lang,
      registry: search.registry,
      sort: search.sort,
      starsMax: search.starsMax,
      starsMin: search.starsMin,
    }
  }, [search])

  // Count active filters for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilters.sort && currentFilters.sort !== 'stars') count++
    if (currentFilters.registry) count++
    if (currentFilters.category) count++
    if (currentFilters.lang) count++
    if (currentFilters.starsMin || currentFilters.starsMax) count++
    if (currentFilters.dateFrom || currentFilters.dateTo) count++
    if (currentFilters.archived) count++
    return count
  }, [currentFilters])

  // Remove individual filter on mobile
  const handleRemoveFilter = (key: 'date' | 'stars' | keyof FilterValues) => {
    if (key === 'stars') {
      handleFiltersChange({
        ...currentFilters,
        starsMin: undefined,
        starsMax: undefined,
      })
    } else if (key === 'date') {
      handleFiltersChange({
        ...currentFilters,
        dateFrom: undefined,
        dateTo: undefined,
      })
    } else {
      handleFiltersChange({
        ...currentFilters,
        [key]: undefined,
      })
    }
  }

  // Clear all filters on mobile
  const handleClearAllFilters = () => {
    handleFiltersChange({})
  }

  // Update URL when tags change from search bar
  const handleTagsChange = (tags: SearchTag[]) => {
    const newSearch: RegistrySearch = { ...search }

    // Clear search query
    delete newSearch.q

    // Apply new tags
    tags.forEach(tag => {
      switch (tag.type) {
        case 'text':
          newSearch.q = tag.value
          break
      }
    })

    void navigate({ search: newSearch })
  }

  // Update URL when filters change from sidebar
  const handleFiltersChange = (filters: FilterValues) => {
    const newSearch: RegistrySearch = {
      ...search,
      archived: filters.archived,
      category: filters.category,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      lang: filters.lang,
      registry: filters.registry,
      sort: filters.sort || search.sort,
      starsMax: filters.starsMax,
      starsMin: filters.starsMin,
    }

    void navigate({ search: newSearch })
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Main Content - Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar (Desktop Only) */}
        <FiltersSidebar
          onFiltersChange={handleFiltersChange}
          registryNames={registryNames}
          selectedFilters={currentFilters}
          selectedRegistry={search.registry}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Active Filter Chips (Mobile Only) */}
          <div className="bg-muted/30 px-6 pt-4 md:hidden">
            <ActiveFilterChips
              filters={currentFilters}
              onClearAll={handleClearAllFilters}
              onRemoveFilter={handleRemoveFilter}
            />
          </div>

          <RegistryBrowserContent
            dateFrom={search.dateFrom}
            dateTo={search.dateTo}
            hideArchived={search.archived === 'false'}
            maxStars={search.starsMax ? parseInt(search.starsMax) : undefined}
            minStars={search.starsMin ? parseInt(search.starsMin) : undefined}
            onFiltersChange={handleFiltersChange}
            onTagsChange={handleTagsChange}
            searchQuery={search.q}
            selectedCategory={search.category}
            selectedFilters={currentFilters}
            selectedLanguage={search.lang}
            selectedRegistry={search.registry}
            sortBy={search.sort || 'stars'}
          />
        </div>
      </div>

      {/* Mobile Filter Button */}
      <MobileFilterButton
        activeCount={activeFilterCount}
        onClick={() => {
          setIsBottomSheetOpen(true)
        }}
      />

      {/* Mobile Bottom Sheet */}
      <FiltersBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
        }}
        onFiltersChange={handleFiltersChange}
        registryNames={registryNames}
        selectedFilters={currentFilters}
        selectedRegistry={search.registry}
      />
    </div>
  )
}

// Content component with FacetedSearchBar
function RegistryBrowserContent({
  dateFrom,
  dateTo,
  hideArchived,
  maxStars,
  minStars,
  onFiltersChange,
  onTagsChange,
  searchQuery,
  selectedCategory,
  selectedFilters,
  selectedLanguage,
  selectedRegistry,
  sortBy,
}: {
  dateFrom?: string
  dateTo?: string
  hideArchived?: boolean
  maxStars?: number
  minStars?: number
  onFiltersChange: (filters: FilterValues) => void
  onTagsChange: (tags: SearchTag[]) => void
  searchQuery?: string
  selectedCategory?: string
  selectedFilters: FilterValues
  selectedLanguage?: string
  selectedRegistry?: string
  sortBy: 'name' | 'stars' | 'updated'
}) {
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
      minStars: minStars && minStars > 0 ? minStars : undefined,
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
      {/* Faceted Search Bar */}
      <div className="bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <FacetedSearchBar
          activeFilters={selectedFilters}
          onFiltersChange={onFiltersChange}
          onSearchChange={query => {
            const tags: SearchTag[] = query.trim()
              ? [{ label: query.trim(), type: 'text', value: query.trim() }]
              : []
            onTagsChange(tags)
          }}
          searchQuery={searchQuery}
          totalResults={total}
        />
      </div>

      {/* Items Grid with Scroll */}
      <div className="bg-muted/30 flex-1 overflow-y-auto p-4 sm:p-6">
        <ItemsGrid items={allItems} sortBy={sortBy} />
      </div>

      {/* Pagination Controls */}
      {hasNextPage && (
        <div className="bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
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
