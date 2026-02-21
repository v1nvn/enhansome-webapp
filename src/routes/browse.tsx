import { useMemo, useState } from 'react'

import { useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Star,
  X,
} from 'lucide-react'

import type { FilterPreset } from '@/lib/filter-presets'
import type { RegistryItem } from '@/types/registry'

import { CompareDrawer } from '@/components/CompareDrawer'
import {
  EnhancedSearchBar,
  type EnhancedSearchBarFilters,
} from '@/components/EnhancedSearchBar'
import {
  metadataQueryOptions,
  searchInfiniteQueryOptions,
} from '@/lib/server-functions'

const PAGE_SIZE = 20

interface BrowseSearch {
  category?: string
  lang?: string
  preset?: FilterPreset
  q?: string
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

export const Route = createFileRoute('/browse')({
  component: BrowsePage,
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    category: search.category as string | undefined,
    lang: search.lang as string | undefined,
    preset: search.preset as FilterPreset | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort:
      (search.sort as 'name' | 'quality' | 'stars' | 'updated' | undefined) ||
      'quality',
  }),
  loaderDeps: ({ search }) => ({
    category: search.category,
    registry: search.registry,
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(metadataQueryOptions())
  },
  pendingComponent: () => (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="py-8">
          <div className="bg-muted/30 h-8 w-32 animate-pulse rounded" />
          <div className="mt-4 h-12 w-full max-w-2xl animate-pulse rounded-xl" />
        </div>
        {/* Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              className="bg-card h-72 animate-pulse rounded-2xl"
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

// ============================================================================
// INLINE COMPONENTS
// ============================================================================

// ActiveFilterChip - Removable filter pill
function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <button
      className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
      onClick={onRemove}
      type="button"
    >
      {label}
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

// BrowseCard - Minimal vertical grid card
function BrowseCard({
  isSelected,
  item,
  onCompareToggle,
}: {
  isSelected: boolean
  item: RegistryItem
  onCompareToggle: () => void
}) {
  const repoDetailLink =
    item.repo_info?.owner && item.repo_info.repo
      ? `/repo/${item.repo_info.owner}/${item.repo_info.repo}`
      : null

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
    <div
      className={`bg-card duration-250 group relative rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
        isSelected ? 'ring-primary/50 shadow-primary/20 shadow-md ring-2' : ''
      }`}
    >
      {/* Compare Checkbox - Top Right */}
      <div className="absolute right-4 top-4 z-10">
        <input
          checked={isSelected}
          className="border-border/50 bg-background/80 hover:border-primary/50 focus:ring-primary/50 h-4 w-4 cursor-pointer rounded border backdrop-blur-sm transition-all focus:ring-2 focus:ring-offset-0"
          onChange={onCompareToggle}
          type="checkbox"
        />
      </div>

      {/* Language Badge */}
      {item.repo_info?.language && (
        <span className="bg-muted/40 text-muted-foreground mb-3 inline-block rounded-lg px-2.5 py-1 text-xs font-medium">
          {item.repo_info.language}
        </span>
      )}

      {/* Title */}
      {repoDetailLink ? (
        <a
          className="font-display text-foreground hover:text-primary block text-lg font-semibold leading-tight transition-colors"
          href={repoDetailLink}
        >
          {item.title}
        </a>
      ) : (
        <h3 className="font-display text-foreground text-lg font-semibold leading-tight">
          {item.title}
        </h3>
      )}

      {/* Description */}
      <p className="text-muted-foreground mb-4 mt-2 line-clamp-2 text-sm leading-relaxed">
        {item.description ?? ''}
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Metadata Row */}
      <div className="flex items-center gap-4 text-xs">
        {item.repo_info?.stars !== undefined && (
          <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="font-mono">
              {item.repo_info.stars.toLocaleString()}
            </span>
          </div>
        )}
        {item.repo_info?.last_commit && (
          <div className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.repo_info.last_commit)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {repoDetailLink && (
          <a
            className="bg-muted/60 hover:bg-muted text-foreground flex flex-1 cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            href={repoDetailLink}
          >
            Details
          </a>
        )}
        {item.repo_info?.owner && item.repo_info.repo && (
          <a
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function BrowsePage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // Fetch registry metadata
  const { data: registries = [] } = useSuspenseQuery(metadataQueryOptions())

  // Filters
  const currentFilters = useMemo((): EnhancedSearchBarFilters => {
    return {
      category: search.category,
      lang: search.lang,
      preset: search.preset,
      registry: search.registry,
      sort: search.sort || 'quality',
    }
  }, [search])

  // Update URL when filters change
  const handleFiltersChange = (filters: EnhancedSearchBarFilters) => {
    const newSearch: BrowseSearch = {
      ...search,
      category: filters.category,
      lang: filters.lang,
      preset: filters.preset,
      registry: filters.registry,
      sort: filters.sort || 'quality',
    }
    void navigate({ search: newSearch })
  }

  // Build search params object
  const searchParams = useMemo(
    () => ({
      category: search.category,
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

  // Check if we're on the homepage (no search/filters applied)
  const isHomepage =
    !search.q &&
    !search.preset &&
    !search.registry &&
    !search.lang &&
    !search.category

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BrowsePageContent
          allItems={allItems}
          currentFilters={currentFilters}
          fetchNextPage={fetchNextPage}
          handleFiltersChange={handleFiltersChange}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isHomepage={isHomepage}
          registries={registries}
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
  handleFiltersChange,
  hasNextPage,
  isFetchingNextPage,
  isHomepage,
  registries,
  searchQuery,
  total,
}: {
  allItems: RegistryItem[]
  currentFilters: EnhancedSearchBarFilters
  fetchNextPage: () => Promise<unknown>
  handleFiltersChange: (filters: EnhancedSearchBarFilters) => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isHomepage: boolean
  registries: { name: string; stats: { totalRepos: number }; title: string }[]
  searchQuery?: string
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

  // Presets
  const presets: FilterPreset[] = ['trending', 'popular', 'fresh', 'active']

  // Sort options
  const sortOptions = [
    { value: 'quality', label: 'Best Match' },
    { value: 'stars', label: 'Popular' },
    { value: 'updated', label: 'Fresh' },
    { value: 'name', label: 'A–Z' },
  ] as const

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-foreground mb-2 text-3xl font-bold">
          Discovery
        </h1>
        <p className="text-muted-foreground text-sm">
          {total.toLocaleString()} tools curated for you
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <EnhancedSearchBar
          defaultValue={searchQuery}
          enableIntentDetection={true}
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
          placeholder="Search repositories..."
          resultsCount={total}
          to="/browse"
        />
      </div>

      {/* Quick Filter Pills */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Presets */}
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Quick Filters
        </span>
        {presets.map(preset => {
          const label = preset.charAt(0).toUpperCase() + preset.slice(1)
          return (
            <FilterPill
              active={currentFilters.preset === preset}
              key={preset}
              onClick={() => {
                handleFiltersChange({
                  ...currentFilters,
                  preset: currentFilters.preset === preset ? undefined : preset,
                })
              }}
            >
              {label}
            </FilterPill>
          )
        })}

        {/* Sort Options */}
        <span className="text-muted-foreground ml-4 text-xs font-semibold uppercase tracking-wider">
          Sort
        </span>
        {sortOptions.map(option => (
          <FilterPill
            active={currentFilters.sort === option.value}
            key={option.value}
            onClick={() => {
              handleFiltersChange({
                ...currentFilters,
                sort: option.value,
              })
            }}
          >
            {option.label}
          </FilterPill>
        ))}

        {/* Registry Dropdown */}
        <span className="text-muted-foreground ml-4 text-xs font-semibold uppercase tracking-wider">
          Registry
        </span>
        <RegistryDropdown
          onChange={value => {
            handleFiltersChange({ ...currentFilters, registry: value })
          }}
          registries={registries}
          selected={currentFilters.registry}
        />
      </div>

      {/* Active Filter Chips */}
      {(currentFilters.preset ||
        currentFilters.registry ||
        currentFilters.lang ||
        currentFilters.category) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {currentFilters.preset && (
            <ActiveFilterChip
              label={
                currentFilters.preset.charAt(0).toUpperCase() +
                currentFilters.preset.slice(1)
              }
              onRemove={() => {
                handleFiltersChange({ ...currentFilters, preset: undefined })
              }}
            />
          )}
          {currentFilters.registry && (
            <ActiveFilterChip
              label={
                registries
                  .find(r => r.name === currentFilters.registry)
                  ?.title.replace(/^(awesome|enhansome)/i, '')
                  .replace(/ with stars$/i, '')
                  .trim() || currentFilters.registry
              }
              onRemove={() => {
                handleFiltersChange({ ...currentFilters, registry: undefined })
              }}
            />
          )}
          {currentFilters.lang && (
            <ActiveFilterChip
              label={currentFilters.lang}
              onRemove={() => {
                handleFiltersChange({ ...currentFilters, lang: undefined })
              }}
            />
          )}
          {currentFilters.category && (
            <ActiveFilterChip
              label={currentFilters.category}
              onRemove={() => {
                handleFiltersChange({ ...currentFilters, category: undefined })
              }}
            />
          )}
        </div>
      )}

      {/* Results Header (when searching) */}
      {!isHomepage && (
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold">
            {searchQuery ? `Results for "${searchQuery}"` : 'All Items'}
          </h2>
        </div>
      )}

      {/* Items Grid */}
      {allItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allItems.map((item, itemIdx) => {
            const itemKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}-${itemIdx}`
            // Use a unique key without the index for compare state consistency
            const compareKey = `${item.title}-${item.repo_info?.owner || ''}-${item.repo_info?.repo || ''}`
            return (
              <BrowseCard
                isSelected={selectedItems.has(compareKey)}
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
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">
              No repositories found
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Try adjusting your filters or search query
            </p>
          </div>
        </div>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="mt-10 flex justify-center">
          <button
            className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
                <ChevronDown className="h-4 w-4" />
                <span className="bg-primary-foreground/20 rounded-full px-2.5 py-0.5 text-xs">
                  {allItems.length} / {total}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Floating Compare Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          aria-label={`Compare ${selectedItems.size} selected items`}
          className={`duration-250 inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-xl transition-all ${
            selectedItems.size >= 2
              ? 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-2xl active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          disabled={selectedItems.size < 2}
          onClick={() => {
            if (selectedItems.size >= 2) setIsCompareOpen(true)
          }}
          type="button"
        >
          <span className="text-sm">Compare</span>
          {selectedItems.size > 0 && (
            <span className="bg-primary-foreground/20 rounded-full px-2 py-0.5 text-xs font-bold">
              {selectedItems.size}
            </span>
          )}
        </button>
      </div>

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
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

// FilterPill - Elegant pill button for presets
function FilterPill({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean
  children?: React.ReactNode
  count?: number
  onClick: () => void
}) {
  const baseClasses =
    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-250'

  return (
    <button
      className={`${baseClasses} ${
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      } rounded-full`}
      onClick={onClick}
      type="button"
    >
      {children}
      {count !== undefined && (
        <span className="text-muted-foreground/60 text-xs">{count}</span>
      )}
    </button>
  )
}

// RegistryDropdown - Clean dropdown for registry selection
function RegistryDropdown({
  onChange,
  registries,
  selected,
}: {
  onChange: (value: string | undefined) => void
  registries: { name: string; stats: { totalRepos: number }; title: string }[]
  selected: string | undefined
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredRegistries = useMemo(() => {
    if (!search.trim()) {
      return registries.sort((a, b) => b.stats.totalRepos - a.stats.totalRepos)
    }
    const term = search.toLowerCase()
    return registries
      .filter(
        r =>
          r.name.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term),
      )
      .sort((a, b) => b.stats.totalRepos - a.stats.totalRepos)
  }, [registries, search])

  const selectedRegistry = registries.find(r => r.name === selected)
  const displayTitle = selectedRegistry
    ? selectedRegistry.title
        .replace(/^(awesome|enhansome)/i, '')
        .replace(/ with stars$/i, '')
        .trim()
    : 'All Registries'

  return (
    <div className="relative">
      <button
        className="bg-card hover:bg-muted/20 border-border/30 flex items-center gap-2 rounded-full border-2 px-4 py-2 pr-3 text-sm font-medium shadow-sm transition-all"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        type="button"
      >
        <Filter className="text-muted-foreground h-4 w-4" />
        <span>{displayTitle}</span>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <button
            aria-label="Close registry dropdown"
            className="fixed inset-0 z-10 cursor-pointer"
            onClick={() => {
              setIsOpen(false)
            }}
            type="button"
          />
          <div className="bg-card border-border/30 shadow-foreground/5 absolute top-full z-20 mt-2 w-72 rounded-2xl border shadow-xl">
            {/* Search */}
            <div className="border-border/30 border-b p-3">
              <div className="relative">
                <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input
                  className="bg-muted/30 focus:ring-primary/20 w-full rounded-xl border-0 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
                  onChange={e => {
                    setSearch(e.target.value)
                  }}
                  placeholder="Search registries..."
                  type="text"
                  value={search}
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto p-2">
              <button
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  !selected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  onChange(undefined)
                  setIsOpen(false)
                }}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span>All Registries</span>
                  <span className="text-muted-foreground/50 text-xs">
                    {registries
                      .reduce((sum, r) => sum + r.stats.totalRepos, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </button>
              {filteredRegistries.map(registry => {
                const title = registry.title
                  .replace(/^(awesome|enhansome)/i, '')
                  .replace(/ with stars$/i, '')
                  .trim()
                return (
                  <button
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      selected === registry.name
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                    key={registry.name}
                    onClick={() => {
                      onChange(registry.name)
                      setIsOpen(false)
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{title}</span>
                      <span className="text-muted-foreground/50 text-xs">
                        {registry.stats.totalRepos.toLocaleString()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
