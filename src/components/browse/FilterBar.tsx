import { useMemo, useState } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Search, X } from 'lucide-react'

import type { FilterOptions } from '@/lib/db/repositories/search-repository'

import { extractIntent, type IntentSignal } from '@/lib/utils/search'

export interface FilterBarFilters {
  cat?: string
  lang?: string
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
  tag?: string
}

interface FilterBarProps {
  defaultValue?: string
  enableIntentDetection?: boolean
  filterOptions?: FilterOptions
  filters: FilterBarFilters
  onFiltersChange: (filters: FilterBarFilters) => void
  placeholder?: string
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
  filters,
  onFiltersChange,
  placeholder = 'Search repositories...',
  resultsCount,
  to = '/browse',
}: FilterBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [removedSignalIds, setRemovedSignalIds] = useState<Set<string>>(
    () => new Set(),
  )
  const navigate = useNavigate()

  // Extract intent from query
  const intent = useMemo(() => {
    if (!enableIntentDetection || !query.trim()) {
      return null
    }
    return extractIntent(query)
  }, [query, enableIntentDetection])

  // Derive detected signals from intent, filtering out removed ones
  const detectedSignals = useMemo(() => {
    if (!intent) return []
    return intent.signals.filter(s => !removedSignalIds.has(s.id))
  }, [intent, removedSignalIds])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
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

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters, [key]: undefined }
    onFiltersChange(newFilters)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleClearAll = () => {
    onFiltersChange({})
    setQuery('')
    setRemovedSignalIds(new Set())
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
    setRemovedSignalIds(prev => new Set(prev).add(signal.id))
  }

  const formatLabel = (slug: string): string => {
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Build active filter chips (language and tag - category/registry are in sidebar)
  const activeChips: { key: string; label: string }[] = []
  if (filters.registry) {
    activeChips.push({ key: 'registry', label: filters.registry })
  }
  if (filters.cat) {
    activeChips.push({ key: 'cat', label: filters.cat })
  }
  if (filters.lang) {
    activeChips.push({ key: 'lang', label: filters.lang })
  }
  if (filters.tag) {
    activeChips.push({ key: 'tag', label: filters.tag })
  }

  return (
    <div className="space-y-4">
      {/* Main Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <form className="flex-1" onSubmit={handleSubmit}>
          <div className="group relative">
            <div className="flex w-full items-center gap-3 rounded-2xl bg-card/80 px-5 py-3 shadow-sm backdrop-blur-xl transition-all group-hover:bg-card focus-within:ring-2 focus-within:shadow-primary/10 focus-within:ring-primary/30">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
              <input
                className="min-w-[200px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                onChange={e => {
                  setQuery(e.target.value)
                }}
                placeholder={placeholder}
                type="text"
                value={query}
              />
              {query && (
                <button
                  className="rounded-full p-1 text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground"
                  onClick={() => {
                    setQuery('')
                    setRemovedSignalIds(new Set())
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
            className="appearance-none rounded-xl border-2 border-border/30 bg-card px-4 py-3 pr-10 text-sm font-medium shadow-sm transition-all hover:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
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
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Detected Intent Signals */}
      {enableIntentDetection && detectedSignals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Detected
          </span>
          {detectedSignals.map(signal => (
            <button
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-all hover:bg-primary/15"
              key={`${signal.type}-${signal.id}`}
              onClick={() => {
                handleRemoveSignal(signal)
              }}
              type="button"
            >
              {signal.label}
              <span className="rounded-full p-0.5 transition-colors hover:bg-primary/20">
                ×
              </span>
            </button>
          ))}
          {resultsCount !== undefined && (
            <span className="text-sm text-muted-foreground">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/15"
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
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground"
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
