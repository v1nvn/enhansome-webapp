import { useMemo, useState } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Code, Filter, Search, Tag, X } from 'lucide-react'

import type { FilterOptions } from '@/lib/api/server-functions'

import { extractIntent, type IntentSignal } from '@/lib/utils/search'

import type { FilterDropdownItem } from './FilterDropdown'

import { FilterDropdown } from './FilterDropdown'

export interface FilterBarFilters {
  category?: string
  categoryName?: string
  lang?: string
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

interface FilterBarProps {
  defaultValue?: string
  enableIntentDetection?: boolean
  filterOptions?: FilterOptions
  filters: FilterBarFilters
  onFiltersChange: (filters: FilterBarFilters) => void
  placeholder?: string
  registries: { name: string; stats: { totalRepos: number }; title: string }[]
  resultsCount?: number
  to?: string
}

const SORT_OPTIONS = [
  { value: 'quality', label: 'Best Match' },
  { value: 'stars', label: 'Popular' },
  { value: 'updated', label: 'Fresh' },
  { value: 'name', label: 'A–Z' },
] as const

export function FilterBar({
  defaultValue = '',
  enableIntentDetection = true,
  filterOptions,
  filters,
  onFiltersChange,
  placeholder = 'Search repositories...',
  registries,
  resultsCount,
  to = '/browse',
}: FilterBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [detectedSignals, setDetectedSignals] = useState<IntentSignal[]>([])
  const navigate = useNavigate()

  // Extract intent from query
  const intent = useMemo(() => {
    if (!enableIntentDetection || !query.trim()) {
      return null
    }
    return extractIntent(query)
  }, [query, enableIntentDetection])

  // Update detected signals when intent changes
  useMemo(() => {
    if (intent) {
      setDetectedSignals(intent.signals)
    } else {
      setDetectedSignals([])
    }
  }, [intent])

  // Build registry dropdown items from filterOptions
  const registryItems = useMemo((): FilterDropdownItem[] => {
    if (filterOptions?.registries) {
      return filterOptions.registries.map(r => ({
        count: r.count,
        label: r.label,
        value: r.name,
      }))
    }
    // Fallback: derive from registries metadata
    return registries
      .sort((a, b) => b.stats.totalRepos - a.stats.totalRepos)
      .map(r => ({
        count: r.stats.totalRepos,
        label: r.title
          .replace(/^(awesome|enhansome)\s*/i, '')
          .replace(/\s+with stars$/i, '')
          .trim(),
        value: r.name,
      }))
  }, [filterOptions?.registries, registries])

  // Build language dropdown items from filterOptions
  const languageItems = useMemo((): FilterDropdownItem[] => {
    if (!filterOptions?.languages) return []
    return filterOptions.languages.map(l => ({
      count: l.count,
      label: l.name,
      value: l.name,
    }))
  }, [filterOptions?.languages])

  // Build category dropdown items from filterOptions
  const categoryItems = useMemo((): FilterDropdownItem[] => {
    if (!filterOptions?.categories) return []
    return filterOptions.categories.map(c => ({
      count: c.count,
      label: c.name,
      value: c.name,
    }))
  }, [filterOptions?.categories])

  const selectedRegistry = registries.find(r => r.name === filters.registry)
  const displayRegistryTitle = selectedRegistry
    ? selectedRegistry.title
        .replace(/^(awesome|enhansome)/i, '')
        .replace(/ with stars$/i, '')
        .trim()
    : undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    void navigate({
      to,
      search: trimmedQuery ? { q: trimmedQuery, ...filters } : { ...filters },
    })
  }

  const handleSortChange = (sort: FilterBarFilters['sort']) => {
    const newFilters = { ...filters, sort }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleRegistryChange = (registry: string | undefined) => {
    const newFilters = { ...filters, registry }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleLanguageChange = (lang: string | undefined) => {
    const newFilters = { ...filters, lang }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleCategoryChange = (cat: string | undefined) => {
    const newFilters = { ...filters, cat }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters, [key]: undefined }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleClearAll = () => {
    onFiltersChange({})
    setQuery('')
    setDetectedSignals([])
    void navigate({ to })
  }

  const handleRemoveSignal = (signal: IntentSignal) => {
    let newQuery = query
    const signalValue = signal.filterValue.toLowerCase()

    const patterns = [
      new RegExp(signalValue, 'gi'),
      new RegExp(signalValue.replace(/[-_]/g, ' '), 'gi'),
    ]
    for (const pattern of patterns) {
      if (pattern.test(newQuery)) {
        newQuery = newQuery.replace(pattern, ' ').trim()
        break
      }
    }

    setQuery(newQuery)
    setDetectedSignals(prev => prev.filter(s => s.id !== signal.id))
  }

  const formatLabel = (slug: string): string => {
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Build active filter chips
  const activeChips: { key: string; label: string }[] = []
  if (filters.registry && selectedRegistry) {
    activeChips.push({
      key: 'registry',
      label: displayRegistryTitle ?? filters.registry,
    })
  }
  if (filters.lang) {
    activeChips.push({ key: 'lang', label: filters.lang })
  }
  if (filters.categoryName) {
    activeChips.push({ key: 'categoryName', label: filters.categoryName })
  }
  if (filters.category) {
    activeChips.push({ key: 'category', label: filters.category })
  }

  return (
    <div className="space-y-4">
      {/* Main Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <form className="flex-1" onSubmit={handleSubmit}>
          <div className="group relative">
            <div className="bg-card/80 focus-within:ring-primary/30 group-hover:bg-card focus-within:shadow-primary/10 flex w-full items-center gap-3 rounded-2xl px-5 py-3 shadow-sm backdrop-blur-xl transition-all focus-within:ring-2">
              <Search className="text-muted-foreground/60 group-focus-within:text-primary h-4 w-4 shrink-0 transition-colors" />
              <input
                className="text-foreground placeholder:text-muted-foreground/50 min-w-[200px] flex-1 bg-transparent text-sm outline-none"
                onChange={e => {
                  setQuery(e.target.value)
                }}
                placeholder={placeholder}
                type="text"
                value={query}
              />
              {query && (
                <button
                  className="text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full p-1 transition-all"
                  onClick={() => {
                    setQuery('')
                    setDetectedSignals([])
                  }}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            className="bg-card hover:bg-muted/20 border-border/30 focus:ring-primary/20 appearance-none rounded-xl border-2 px-4 py-3 pr-10 text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-0"
            onChange={e => {
              handleSortChange(
                e.target.value as FilterBarFilters['sort'] | undefined,
              )
            }}
            value={filters.sort || 'quality'}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        {/* Registry Dropdown */}
        <FilterDropdown
          allLabel="All Registries"
          icon={Filter}
          items={registryItems}
          onSelect={handleRegistryChange}
          searchPlaceholder="Search registries..."
          selectedValue={filters.registry}
        />

        {/* Language Dropdown */}
        <FilterDropdown
          allLabel="All Languages"
          icon={Code}
          items={languageItems}
          onSelect={handleLanguageChange}
          searchPlaceholder="Search languages..."
          selectedValue={filters.lang}
          widthClass="w-64"
        />

        {/* Category Dropdown */}
        <FilterDropdown
          allLabel="All Categories"
          icon={Tag}
          items={categoryItems}
          onSelect={handleCategoryChange}
          searchPlaceholder="Search categories..."
          selectedValue={filters.categoryName}
        />
      </div>

      {/* Detected Intent Signals */}
      {enableIntentDetection && detectedSignals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Detected
          </span>
          {detectedSignals.map(signal => (
            <button
              className="bg-primary/10 text-primary hover:bg-primary/15 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all"
              key={`${signal.type}-${signal.id}`}
              onClick={() => {
                handleRemoveSignal(signal)
              }}
              type="button"
            >
              {signal.label}
              <span className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                ×
              </span>
            </button>
          ))}
          {resultsCount !== undefined && (
            <span className="text-muted-foreground text-sm">
              Found {resultsCount.toLocaleString()} results
              {intent?.category && ` for ${formatLabel(intent.category)}`}
              {intent?.framework && ` for ${formatLabel(intent.framework)}`}
            </span>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map(chip => (
            <button
              className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
              key={chip.key}
              onClick={() => {
                handleRemoveFilter(chip.key)
              }}
              type="button"
            >
              {chip.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              className="bg-muted/60 hover:bg-muted/80 hover:text-foreground text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
              onClick={handleClearAll}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
