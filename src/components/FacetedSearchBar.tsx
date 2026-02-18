import { useMemo, useState } from 'react'

import {
  Badge,
  Flame,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'

import type { FilterValues } from '@/components/FiltersSidebar'

interface FacetedSearchBarProps {
  activeFilters: FilterValues
  onFiltersChange: (filters: FilterValues) => void
  onSearchChange: (query: string) => void
  searchQuery?: string
  totalResults?: number
}

interface FilterPreset {
  apply: (filters: FilterValues) => FilterValues
  color: string
  description: string
  icon: React.ReactNode
  label: string
}

export function FacetedSearchBar({
  activeFilters,
  onFiltersChange,
  onSearchChange,
  searchQuery = '',
  totalResults,
}: FacetedSearchBarProps) {
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [showPresets, setShowPresets] = useState(false)

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeFilters.sort && activeFilters.sort !== 'stars') count++
    if (activeFilters.registry) count++
    if (activeFilters.category) count++
    if (activeFilters.lang) count++
    if (activeFilters.starsMin || activeFilters.starsMax) count++
    if (activeFilters.dateFrom || activeFilters.dateTo) count++
    if (activeFilters.archived) count++
    return count
  }, [activeFilters])

  // Define filter presets with editorial descriptions
  const presets: FilterPreset[] = useMemo(
    () => [
      {
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        description: 'Rising stars from the past week',
        icon: <TrendingUp className="h-4 w-4" />,
        label: 'Trending',
        apply: filters => ({
          ...filters,
          dateFrom: getDateWeeksAgo(1),
          sort: 'stars',
        }),
      },
      {
        color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        description: 'Projects with 1,000+ stars',
        icon: <Star className="h-4 w-4" />,
        label: 'Popular',
        apply: filters => ({
          ...filters,
          starsMin: '1000',
        }),
      },
      {
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        description: 'Updated in the last 3 months',
        icon: <Sparkles className="h-4 w-4" />,
        label: 'Fresh',
        apply: filters => ({
          ...filters,
          dateFrom: getDateMonthsAgo(3),
          sort: 'updated',
        }),
      },
      {
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        description: 'Recently maintained, non-archived',
        icon: <Flame className="h-4 w-4" />,
        label: 'Active',
        apply: filters => ({
          ...filters,
          dateFrom: getDateMonthsAgo(6),
          archived: 'false',
        }),
      },
    ],
    [],
  )

  // Build active filter chips for display
  const activeFilterChips = useMemo(() => {
    const chips: {
      key: string
      label: string
      onRemove: () => void
      type?: 'custom' | 'preset'
    }[] = []

    const sortLabels = {
      name: 'Alphabetical',
      stars: 'Most Stars',
      updated: 'Recently Updated',
    }

    if (activeFilters.sort && activeFilters.sort !== 'stars') {
      chips.push({
        key: 'sort',
        label: sortLabels[activeFilters.sort],
        onRemove: () => {
          onFiltersChange({ ...activeFilters, sort: 'stars' })
        },
        type: 'custom',
      })
    }

    if (activeFilters.registry) {
      chips.push({
        key: 'registry',
        label: activeFilters.registry.replace('awesome-', ''),
        onRemove: () => {
          onFiltersChange({
            ...activeFilters,
            registry: undefined,
            category: undefined,
          })
        },
        type: 'custom',
      })
    }

    if (activeFilters.category) {
      chips.push({
        key: 'category',
        label: activeFilters.category.split('::')[1] || activeFilters.category,
        onRemove: () => {
          onFiltersChange({ ...activeFilters, category: undefined })
        },
        type: 'custom',
      })
    }

    if (activeFilters.lang) {
      chips.push({
        key: 'lang',
        label: activeFilters.lang,
        onRemove: () => {
          onFiltersChange({ ...activeFilters, lang: undefined })
        },
        type: 'custom',
      })
    }

    if (activeFilters.starsMin || activeFilters.starsMax) {
      chips.push({
        key: 'stars',
        label: `${activeFilters.starsMin || '0'}+ stars`,
        onRemove: () => {
          onFiltersChange({
            ...activeFilters,
            starsMin: undefined,
            starsMax: undefined,
          })
        },
        type: 'custom',
      })
    }

    if (activeFilters.dateFrom || activeFilters.dateTo) {
      chips.push({
        key: 'date',
        label: 'Date filtered',
        onRemove: () => {
          onFiltersChange({
            ...activeFilters,
            dateFrom: undefined,
            dateTo: undefined,
          })
        },
        type: 'custom',
      })
    }

    if (activeFilters.archived) {
      chips.push({
        key: 'archived',
        label: activeFilters.archived === 'true' ? 'Archived' : 'Active',
        onRemove: () => {
          onFiltersChange({ ...activeFilters, archived: undefined })
        },
        type: 'custom',
      })
    }

    return chips
  }, [activeFilters, onFiltersChange])

  const handlePresetClick = (preset: FilterPreset) => {
    const newFilters = preset.apply(activeFilters)
    onFiltersChange(newFilters)
    setShowPresets(false)
  }

  const handleClearAllFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className="space-y-4">
      {/* Search Bar with Presets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input - Editorial style with accent border */}
        <div className="group relative flex-1">
          <div className="border-border/30 bg-card/80 focus-within:border-primary/50 focus-within:ring-primary/20 group-hover:border-border/50 flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-3.5 backdrop-blur-sm transition-all focus-within:ring-4">
            <Search className="text-muted-foreground/70 group-focus-within:text-primary group-hover:text-muted-foreground h-5 w-5 shrink-0 transition-colors" />

            <input
              className="text-foreground placeholder:text-muted-foreground/50 min-w-[200px] flex-1 bg-transparent font-medium outline-none"
              onChange={e => {
                setSearchInput(e.target.value)
                onSearchChange(e.target.value)
              }}
              placeholder="Search packages, categories..."
              type="text"
              value={searchInput}
            />

            {searchInput && (
              <button
                className="text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full p-1.5 transition-all"
                onClick={() => {
                  setSearchInput('')
                  onSearchChange('')
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Decorative accent line */}
          <div className="from-primary/50 via-primary to-primary/50 absolute -bottom-px left-6 right-6 h-0.5 bg-gradient-to-r opacity-0 transition-opacity group-focus-within:opacity-100" />
        </div>

        {/* Presets Button - More editorial */}
        <div className="relative">
          <button
            className="border-border/30 bg-card/80 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-primary/20 group flex items-center gap-2.5 rounded-2xl border-2 px-5 py-3.5 text-sm font-semibold transition-all hover:shadow-lg"
            onClick={() => {
              setShowPresets(!showPresets)
            }}
            type="button"
          >
            <Flame className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Quick Filters</span>
            <span className="sm:hidden">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30 ml-1 border px-1.5 py-0 text-xs font-semibold">
                {activeFilterCount}
              </Badge>
            )}
          </button>

          {showPresets && (
            <>
              {/* Backdrop with blur */}
              <div
                aria-hidden="true"
                className="bg-background/60 fixed inset-0 z-40 backdrop-blur-[2px]"
                onClick={() => {
                  setShowPresets(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setShowPresets(false)
                  }
                }}
                role="button"
                tabIndex={0}
              />

              {/* Enhanced Dropdown with editorial styling */}
              <div className="bg-card/95 border-border/50 absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border-2 shadow-2xl backdrop-blur-xl">
                <div className="p-3">
                  <div className="text-muted-foreground mb-3 px-2 py-1.5 text-xs font-bold uppercase tracking-widest">
                    Quick Presets
                  </div>
                  <div className="space-y-1">
                    {presets.map((preset, index) => (
                      <button
                        className="group/badge hover:bg-accent/30 text-foreground hover:text-primary relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all"
                        key={preset.label}
                        onClick={() => {
                          handlePresetClick(preset)
                        }}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                        type="button"
                      >
                        <span
                          className={`bg-${preset.color.split('-')[1]}-500/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover/badge:scale-110 ${preset.color}`}
                        >
                          {preset.icon}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">
                            {preset.label}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {preset.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <>
                    <div className="border-border/50 bg-muted/30 border-t px-3 py-2">
                      <button
                        className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
                        onClick={handleClearAllFilters}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        Clear All Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Chips - Enhanced editorial styling */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Active Filters
          </span>
          {activeFilterChips.map(chip => (
            <button
              className="group/chip bg-accent/20 hover:bg-accent/40 text-accent-foreground border-accent/30 hover:border-accent/50 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all hover:shadow-md"
              key={chip.key}
              onClick={chip.onRemove}
              type="button"
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3 transition-transform group-hover/chip:rotate-90" />
            </button>
          ))}
          <button
            className="text-muted-foreground hover:text-destructive ml-1 text-xs font-medium underline decoration-dotted underline-offset-2 transition-colors"
            onClick={handleClearAllFilters}
            type="button"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results Count - Editorial typography */}
      {totalResults !== undefined && (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-foreground text-3xl font-bold tabular-nums">
            {totalResults.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">
            packages found
            {searchInput && (
              <span className="text-primary/80">
                {' '}
                matching "
                <em className="font-semibold not-italic">{searchInput}</em>"
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0]
}

function getDateWeeksAgo(weeks: number): string {
  const date = new Date()
  date.setDate(date.getDate() - weeks * 7)
  return date.toISOString().split('T')[0]
}
