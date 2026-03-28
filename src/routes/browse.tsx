import { useEffect, useMemo, useRef, useState } from 'react'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Filter, Loader2 } from 'lucide-react'

import type { FilterOptions } from '@/lib/db/repositories/search-repository'
import type { RegistryItem } from '@/types/registry'

import { type BreadcrumbItem, Breadcrumbs } from '@/components/Breadcrumbs'
import {
  BrowseCard,
  FilterBar,
  type FilterBarFilters,
} from '@/components/browse'
import { CompareDrawer } from '@/components/CompareDrawer'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { FilterSidebar } from '@/components/ui/FilterSidebar'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/StateComponents'
import {
  filterOptionsQueryOptions,
  searchInfiniteQueryOptions,
} from '@/lib/api/server-functions'

const PAGE_SIZE = 20

interface BrowseSearch {
  cat?: string
  lang?: string
  q?: string
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
  tag?: string
}

export const Route = createFileRoute('/browse')({
  component: BrowsePage,

  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    cat: search.cat as string | undefined,
    lang: search.lang as string | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort:
      (search.sort as 'name' | 'quality' | 'stars' | 'updated' | undefined) ||
      'quality',
    tag: search.tag as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    cat: search.cat,
    lang: search.lang,
    registry: search.registry,
    tag: search.tag,
  }),
  loader: async ({ context, deps }) => {
    // Preload filter options for initial SSR/CSR render
    await context.queryClient.ensureQueryData(
      filterOptionsQueryOptions({
        categoryName: deps.cat,
        language: deps.lang,
        registryName: deps.registry,
        tagName: deps.tag,
      }),
    )
  },
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="py-8">
          <div className="h-8 w-32 animate-pulse rounded bg-muted/30" />
          <div className="mt-4 h-12 w-full max-w-2xl animate-pulse rounded-xl" />
        </div>
        {/* Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              className="h-72 animate-pulse rounded-2xl bg-card"
              key={`skeleton-${i}`}
            />
          ))}
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: 'Discovery - Enhansome' },
      {
        name: 'description',
        content:
          'Search and discover curated developer tools, libraries, and frameworks across multiple registries.',
      },
    ],
  }),
})

function BrowsePage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // Fetch filter options with placeholder data for smoother transitions
  const { data: filterOptions, isPlaceholderData: isPreviousFilterOptions } =
    useQuery(
      filterOptionsQueryOptions({
        categoryName: search.cat,
        language: search.lang,
        registryName: search.registry,
        tagName: search.tag,
      }),
    )

  // Filters
  const currentFilters = useMemo((): FilterBarFilters => {
    return {
      cat: search.cat,
      lang: search.lang,
      registry: search.registry,
      sort: search.sort || 'quality',
      tag: search.tag,
    }
  }, [search])

  // Update URL when filters change
  const handleFiltersChange = (filters: FilterBarFilters) => {
    const newSearch: BrowseSearch = {
      ...search,
      cat: filters.cat,
      lang: filters.lang,
      registry: filters.registry,
      sort: filters.sort || 'quality',
      tag: filters.tag,
    }
    void navigate({ search: newSearch })
  }

  // Build search params object
  const searchParams = useMemo(
    () => ({
      categoryName: search.cat,
      language: search.lang,
      limit: PAGE_SIZE,
      q: search.q?.trim(),
      registryName: search.registry,
      sortBy: search.sort || 'quality',
      tagName: search.tag,
    }),
    [search],
  )

  // Fetch from search API using infinite query
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery(searchInfiniteQueryOptions(searchParams))

  // Combine all pages
  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? []
  }, [data?.pages])

  const total = data?.pages[data.pages.length - 1]?.total ?? 0

  // Check if we're on the homepage (no search/filters applied)
  const isHomepage =
    !search.q && !search.registry && !search.lang && !search.cat && !search.tag

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrowsePageContent
          allItems={allItems}
          currentFilters={currentFilters}
          fetchNextPage={fetchNextPage}
          filterOptions={filterOptions}
          handleFiltersChange={handleFiltersChange}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          isHomepage={isHomepage}
          isTransitioning={isPreviousFilterOptions}
          search={search}
          searchQuery={search.q}
          total={total}
        />
      </div>
    </div>
  )
}

function BrowsePageContent({
  allItems,
  currentFilters,
  fetchNextPage,
  filterOptions,
  handleFiltersChange,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  isHomepage,
  isTransitioning,
  searchQuery,
  total,
}: {
  allItems: (RegistryItem & { registries?: string[]; tags?: string[] })[]
  currentFilters: FilterBarFilters
  fetchNextPage: () => Promise<unknown>
  filterOptions: FilterOptions | undefined
  handleFiltersChange: (filters: FilterBarFilters) => void
  hasNextPage: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  isHomepage: boolean
  isTransitioning: boolean
  search: BrowseSearch
  searchQuery?: string
  total: number
}) {
  const search = Route.useSearch()

  // Mobile filter panel state
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  const browseSections = useMemo(
    () =>
      filterOptions
        ? [
            {
              items: filterOptions.categories.map(c => ({
                count: c.count,
                label: c.name,
                value: c.name,
              })),
              maxHeight: 'max-h-64',
              paramKey: 'cat',
              searchPlaceholder: 'Search categories...',
              selectedValue: search.cat,
              title: 'Categories',
            },
            {
              items: filterOptions.registries.map(r => ({
                count: r.count,
                label: r.label,
                value: r.name,
              })),
              maxHeight: 'max-h-40',
              paramKey: 'registry',
              searchPlaceholder: 'Search registries...',
              selectedValue: search.registry,
              title: 'Registries',
            },
            {
              items: filterOptions.languages.map(l => ({
                count: l.count,
                label: l.name,
                value: l.name,
              })),
              maxHeight: 'max-h-40',
              paramKey: 'lang',
              searchPlaceholder: 'Search languages...',
              selectedValue: search.lang,
              title: 'Languages',
            },
          ]
        : [],
    [filterOptions, search.cat, search.lang, search.registry],
  )

  // Compare mode state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(),
  )
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (!isFetchingNextPage && entries[0]?.isIntersecting) {
          void fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(loadMoreRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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

  const handleClearAllCompare = () => {
    setSelectedItems(new Set())
    setIsCompareOpen(false)
  }

  // Build breadcrumbs
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []

    if (search.registry) {
      const registryLabel =
        filterOptions?.registries.find(r => r.name === search.registry)
          ?.label || search.registry
      items.push({
        label: registryLabel,
        search: { registry: search.registry },
      })
    }

    if (search.cat) {
      items.push({
        label: search.cat,
        search: { ...search, cat: search.cat },
      })
    }

    if (search.tag && !search.cat) {
      items.push({
        label: search.tag,
        search: { ...search, tag: search.tag },
      })
    }

    return items
  }, [search, filterOptions])

  return (
    <div className="py-8">
      {/* Breadcrumbs */}
      {breadcrumbItems.length > 0 && (
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      )}

      {/* Header */}
      <PageHeader
        actions={
          /* Mobile filter button */
          <button
            aria-label="Open filters"
            className="flex items-center gap-2 rounded-xl border-2 border-border/30 bg-card px-4 py-3 text-sm font-medium shadow-sm transition-all hover:bg-muted/20 lg:hidden"
            onClick={() => {
              setIsMobilePanelOpen(true)
            }}
            type="button"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        }
        description={`${total.toLocaleString()} tools curated for you`}
        title={
          isHomepage
            ? 'Discovery'
            : searchQuery
              ? `Results for "${searchQuery}"`
              : 'Filtered Results'
        }
      />

      {/* Search Bar - Full width on top */}
      <div className="mb-6">
        <FilterBar
          defaultValue={searchQuery}
          enableIntentDetection={true}
          filterOptions={filterOptions}
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
          placeholder="Search repositories..."
          resultsCount={total}
          to="/browse"
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden shrink-0 lg:block">
          {filterOptions && <FilterSidebar sections={browseSections} />}
        </div>

        {/* Main content */}
        <LoadingOverlay
          className="min-w-0 flex-1"
          isLoading={isTransitioning || (isFetching && !isFetchingNextPage)}
        >
          {/* Items Grid */}
          {allItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {allItems.map((item, itemIdx) => {
                const itemKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}-${itemIdx}`
                const compareKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`
                return (
                  <BrowseCard
                    item={item}
                    key={itemKey}
                    onCompareToggle={() => {
                      handleToggleCompare(compareKey)
                    }}
                  />
                )
              })}
            </div>
          ) : (
            <EmptyState
              description="Try adjusting your filters or search query"
              title="No repositories found"
            />
          )}

          {/* Infinite scroll trigger */}
          <div className="flex justify-center py-8" ref={loadMoreRef}>
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        </LoadingOverlay>
      </div>

      {/* Mobile Filter Panel */}
      {filterOptions && (
        <FilterPanel
          isOpen={isMobilePanelOpen}
          onClose={() => {
            setIsMobilePanelOpen(false)
          }}
        >
          <FilterSidebar sections={browseSections} />
        </FilterPanel>
      )}

      {/* Floating Compare Button */}
      {selectedItems.size > 0 && (
        <div className="fixed right-6 bottom-6 z-30">
          <button
            aria-label={`Compare ${selectedItems.size} selected items`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-xl transition-all duration-250 hover:scale-105 hover:shadow-2xl active:scale-95"
            onClick={() => {
              setIsCompareOpen(true)
            }}
            type="button"
          >
            <span className="text-sm">Compare</span>
            <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">
              {selectedItems.size}
            </span>
          </button>
        </div>
      )}

      {/* Compare Drawer */}
      <CompareDrawer
        items={selectedItemObjects}
        onClearAll={handleClearAllCompare}
        onClose={() => {
          setIsCompareOpen(false)
        }}
        onRemove={handleRemoveFromCompare}
        open={isCompareOpen}
      />
    </div>
  )
}
