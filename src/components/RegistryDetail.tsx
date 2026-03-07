import { useEffect, useMemo, useRef, useState } from 'react'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Filter, Loader2, Star } from 'lucide-react'

import { type BreadcrumbItem, Breadcrumbs } from '@/components/Breadcrumbs'
import { BrowseCard } from '@/components/browse/BrowseCard'
import { FilterBar, type FilterBarFilters } from '@/components/browse/FilterBar'
import { RegistryMobileFilterPanel } from '@/components/registry/RegistryMobileFilterPanel'
import { RegistryTagSidebar } from '@/components/registry/RegistryTagSidebar'
import {
  filterOptionsQueryOptions,
  searchInfiniteQueryOptions,
} from '@/lib/api/server-functions'

const PAGE_SIZE = 20

interface RegistryDetailProps {
  initialData: {
    description?: string
    last_updated?: string
    source_repository?: string
    title: string
    total_items: number
    total_stars: number
  }
  onSearchParamsChange: (params: RegistryDetailProps['searchParams']) => void
  registryName: string
  searchParams: {
    cat?: string
    q?: string
    sort?: 'name' | 'quality' | 'stars' | 'updated'
    tag?: string
  }
}

export function RegistryDetail({
  initialData,
  registryName,
  searchParams,
  onSearchParamsChange,
}: RegistryDetailProps) {
  // Mobile filter panel state
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch filter options for this registry
  const { data: filterOptions, isPlaceholderData: isTransitioning } = useQuery(
    filterOptionsQueryOptions({
      categoryName: searchParams.cat,
      registryName,
      tagName: searchParams.tag,
    }),
  )

  // Build search params for the infinite query
  const searchQueryParams = useMemo(
    () => ({
      categoryName: searchParams.cat,
      limit: PAGE_SIZE,
      q: searchParams.q?.trim(),
      registryName,
      sortBy: searchParams.sort || 'quality',
      tagName: searchParams.tag,
    }),
    [registryName, searchParams],
  )

  // Fetch repositories using infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(searchInfiniteQueryOptions(searchQueryParams))

  // Combine all pages
  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? []
  }, [data?.pages])

  const total = data?.pages[data.pages.length - 1]?.total ?? 0

  // Infinite scroll observer
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

  // Build sidebar items from filter options
  const tagItems = useMemo(() => {
    if (!filterOptions?.tags) return []
    return filterOptions.tags.map(t => ({
      count: t.count,
      label: t.name,
      value: t.name,
    }))
  }, [filterOptions])

  const categoryItems = useMemo(() => {
    if (!filterOptions?.categories) return []
    return filterOptions.categories.map(c => ({
      count: c.count,
      label: c.name,
      value: c.name,
    }))
  }, [filterOptions])

  // Build breadcrumbs
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []

    if (searchParams.tag) {
      items.push({
        href: `/registry/${registryName}`,
        label: searchParams.tag,
        search: { tag: searchParams.tag },
      })
    }

    if (searchParams.cat) {
      items.push({
        href: `/registry/${registryName}`,
        label: searchParams.cat,
        search: { ...searchParams, cat: searchParams.cat },
      })
    }

    return items
  }, [registryName, searchParams])

  // Current filters for FilterBar
  const currentFilters = useMemo(
    (): FilterBarFilters => ({
      cat: searchParams.cat,
      registry: registryName,
      sort: searchParams.sort || 'quality',
      tag: searchParams.tag,
    }),
    [registryName, searchParams],
  )

  // Handle filter changes from FilterBar
  const handleFiltersChange = (filters: FilterBarFilters) => {
    onSearchParamsChange({
      cat: filters.cat,
      q: searchParams.q,
      sort: filters.sort || 'quality',
      tag: filters.tag,
    })
  }

  const handleClearFilters = () => {
    onSearchParamsChange({ sort: searchParams.sort })
    setIsMobilePanelOpen(false)
  }

  // Format last updated date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {initialData.title}
              </h1>
              {initialData.description && (
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  {initialData.description}
                </p>
              )}
              {/* Stats Row */}
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {initialData.total_items.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">repositories</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-foreground">
                    {initialData.total_stars.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">stars</span>
                </div>
                {initialData.last_updated && (
                  <div className="text-muted-foreground">
                    Updated {formatDate(initialData.last_updated)}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile filter button */}
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
          </div>
        </div>

        {/* Search Bar - Using FilterBar like browse page */}
        <div className="mb-6">
          <FilterBar
            defaultValue={searchParams.q}
            enableIntentDetection={false}
            filterOptions={filterOptions}
            filters={currentFilters}
            onFiltersChange={handleFiltersChange}
            placeholder="Search within this registry..."
            resultsCount={total}
            to={`/registry/${registryName}`}
          />
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden shrink-0 lg:block">
            {filterOptions && (
              <RegistryTagSidebar
                categories={categoryItems}
                registryName={registryName}
                selectedCategory={searchParams.cat}
                selectedTag={searchParams.tag}
                tags={tagItems}
              />
            )}
          </div>

          {/* Main content */}
          <div className="relative min-w-0 flex-1">
            {/* Loading overlay for filter transitions */}
            {isTransitioning && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Results count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {total.toLocaleString()} repositories
              {searchParams.tag && (
                <span>
                  {' '}
                  in{' '}
                  <span className="font-medium text-foreground">
                    {searchParams.tag}
                  </span>
                </span>
              )}
              {searchParams.cat && (
                <span>
                  {' '}
                  ·{' '}
                  <span className="font-medium text-foreground">
                    {searchParams.cat}
                  </span>
                </span>
              )}
            </div>

            {/* Items Grid */}
            {allItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {allItems.map((item, itemIdx) => {
                  const itemKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}-${itemIdx}`
                  return <BrowseCard item={item} key={itemKey} />
                })}
              </div>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">
                    No repositories found
                  </p>
                  <button
                    className="mt-4 text-sm text-primary hover:underline"
                    onClick={handleClearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            {/* Infinite scroll trigger */}
            <div className="flex justify-center py-8" ref={loadMoreRef}>
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filter Panel */}
        {filterOptions && (
          <RegistryMobileFilterPanel
            categories={categoryItems}
            isOpen={isMobilePanelOpen}
            onClearAll={handleClearFilters}
            onClose={() => {
              setIsMobilePanelOpen(false)
            }}
            registryName={registryName}
            selectedCategory={searchParams.cat}
            selectedTag={searchParams.tag}
            tags={tagItems}
          />
        )}
      </div>
    </div>
  )
}
