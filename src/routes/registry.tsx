import { useMemo, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { FilterValues } from '@/components/FiltersSidebar'
import type { SearchTag } from '@/components/SearchBar'

import ActiveFilterChips from '@/components/ActiveFilterChips'
import FiltersBottomSheet from '@/components/FiltersBottomSheet'
import { FiltersSidebar } from '@/components/FiltersSidebar'
import MobileFilterButton from '@/components/MobileFilterButton'
import { RegistryLayout } from '@/components/RegistryLayout'
import {
  categoriesQueryOptions,
  metadataQueryOptions,
} from '@/lib/server-functions'

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

          <RegistryLayout
            dateFrom={search.dateFrom}
            dateTo={search.dateTo}
            hideArchived={search.archived === 'false'}
            maxStars={search.starsMax ? parseInt(search.starsMax) : undefined}
            minStars={search.starsMin ? parseInt(search.starsMin) : undefined}
            onTagsChange={handleTagsChange}
            searchQuery={search.q}
            selectedCategory={search.category}
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
