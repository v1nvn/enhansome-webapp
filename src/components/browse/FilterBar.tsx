import { useMemo, useState } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Code, Filter, Search, X } from 'lucide-react'

import type { FilterPreset } from '@/lib/utils/filters'

import { extractIntent, type IntentSignal } from '@/lib/utils/search'

export interface FilterBarFilters {
  category?: string
  lang?: string
  preset?: FilterPreset
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

interface FilterBarProps {
  defaultValue?: string
  enableIntentDetection?: boolean
  filters: FilterBarFilters
  languages?: string[]
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

const DEFAULT_LANGUAGES: string[] = []

export function FilterBar({
  defaultValue = '',
  enableIntentDetection = true,
  filters,
  languages = DEFAULT_LANGUAGES,
  onFiltersChange,
  placeholder = 'Search repositories...',
  registries,
  resultsCount,
  to = '/browse',
}: FilterBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [detectedSignals, setDetectedSignals] = useState<IntentSignal[]>([])
  const [isRegistryOpen, setIsRegistryOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [registrySearch, setRegistrySearch] = useState('')
  const [languageSearch, setLanguageSearch] = useState('')
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

  // Filtered registries
  const filteredRegistries = useMemo(() => {
    if (!registrySearch.trim()) {
      return registries.sort((a, b) => b.stats.totalRepos - a.stats.totalRepos)
    }
    const term = registrySearch.toLowerCase()
    return registries
      .filter(
        r =>
          r.name.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term),
      )
      .sort((a, b) => b.stats.totalRepos - a.stats.totalRepos)
  }, [registries, registrySearch])

  // Filtered languages
  const filteredLanguages = useMemo(() => {
    if (!languageSearch.trim()) {
      return languages
    }
    return languages.filter(lang =>
      lang.toLowerCase().includes(languageSearch.toLowerCase()),
    )
  }, [languages, languageSearch])

  const selectedRegistry = registries.find(r => r.name === filters.registry)
  const displayRegistryTitle = selectedRegistry
    ? selectedRegistry.title
        .replace(/^(awesome|enhansome)/i, '')
        .replace(/ with stars$/i, '')
        .trim()
    : 'All Registries'

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
    setIsRegistryOpen(false)
    void navigate({ to, search: { ...newFilters } })
  }

  const handleLanguageChange = (lang: string | undefined) => {
    const newFilters = { ...filters, lang: lang }
    onFiltersChange(newFilters)
    setIsLanguageOpen(false)
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
  if (filters.preset) {
    activeChips.push({
      key: 'preset',
      label: filters.preset.charAt(0).toUpperCase() + filters.preset.slice(1),
    })
  }
  if (filters.registry && selectedRegistry) {
    activeChips.push({
      key: 'registry',
      label: displayRegistryTitle,
    })
  }
  if (filters.lang) {
    activeChips.push({ key: 'lang', label: filters.lang })
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
        <div className="relative">
          <button
            className="bg-card hover:bg-muted/20 border-border/30 flex items-center gap-2 rounded-xl border-2 px-4 py-3 pr-3 text-sm font-medium shadow-sm transition-all"
            onClick={() => {
              setIsRegistryOpen(!isRegistryOpen)
            }}
            type="button"
          >
            <Filter className="text-muted-foreground h-4 w-4" />
            <span className="max-w-[120px] truncate">
              {displayRegistryTitle}
            </span>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${isRegistryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isRegistryOpen && (
            <>
              <button
                aria-label="Close registry dropdown"
                className="fixed inset-0 z-10 cursor-pointer"
                onClick={() => {
                  setIsRegistryOpen(false)
                }}
                type="button"
              />
              <div className="bg-card border-border/30 shadow-foreground/5 absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border shadow-xl">
                {/* Search */}
                <div className="border-border/30 border-b p-3">
                  <div className="relative">
                    <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      className="bg-muted/30 focus:ring-primary/20 w-full rounded-xl border-0 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
                      onChange={e => {
                        setRegistrySearch(e.target.value)
                      }}
                      placeholder="Search registries..."
                      type="text"
                      value={registrySearch}
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto p-2">
                  <button
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      !filters.registry
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                    onClick={() => {
                      handleRegistryChange(undefined)
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
                          filters.registry === registry.name
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/30'
                        }`}
                        key={registry.name}
                        onClick={() => {
                          handleRegistryChange(registry.name)
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

        {/* Language Dropdown */}
        <div className="relative">
          <button
            className="bg-card hover:bg-muted/20 border-border/30 flex items-center gap-2 rounded-xl border-2 px-4 py-3 pr-3 text-sm font-medium shadow-sm transition-all"
            onClick={() => {
              setIsLanguageOpen(!isLanguageOpen)
            }}
            type="button"
          >
            <Code className="text-muted-foreground h-4 w-4" />
            <span className="max-w-[120px] truncate">
              {filters.lang || 'All Languages'}
            </span>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isLanguageOpen && (
            <>
              <button
                aria-label="Close language dropdown"
                className="fixed inset-0 z-10 cursor-pointer"
                onClick={() => {
                  setIsLanguageOpen(false)
                }}
                type="button"
              />
              <div className="bg-card border-border/30 shadow-foreground/5 absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border shadow-xl">
                {/* Search */}
                <div className="border-border/30 border-b p-3">
                  <div className="relative">
                    <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      className="bg-muted/30 focus:ring-primary/20 w-full rounded-xl border-0 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
                      onChange={e => {
                        setLanguageSearch(e.target.value)
                      }}
                      placeholder="Search languages..."
                      type="text"
                      value={languageSearch}
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto p-2">
                  <button
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      !filters.lang
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                    onClick={() => {
                      handleLanguageChange(undefined)
                    }}
                    type="button"
                  >
                    All Languages
                  </button>
                  {filteredLanguages.map(language => (
                    <button
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        filters.lang === language
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/30'
                      }`}
                      key={language}
                      onClick={() => {
                        handleLanguageChange(language)
                      }}
                      type="button"
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
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
