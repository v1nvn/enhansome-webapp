import { useMemo, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Minus, Plus, Search, X } from 'lucide-react'

import type { Category } from '@/lib/server-functions'

import { groupRegistries } from '@/lib/registry-groups'
import {
  categoriesQueryOptions,
  languagesQueryOptions,
} from '@/lib/server-functions'

export interface FilterValues {
  archived?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  lang?: string
  registry?: string
  sort?: 'name' | 'stars' | 'updated'
  starsMax?: string
  starsMin?: string
}

interface FiltersSidebarProps {
  onFiltersChange: (filters: FilterValues) => void
  registryNames: string[]
  selectedFilters: FilterValues
  selectedRegistry?: string
}

export function FiltersSidebar({
  onFiltersChange,
  registryNames,
  selectedFilters,
  selectedRegistry,
}: FiltersSidebarProps) {
  const [categorySearch, setCategorySearch] = useState('')
  const [languageSearch, setLanguageSearch] = useState('')
  const [registrySearch, setRegistrySearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['registry', 'sort']),
  )
  const [expandedRegistryGroups, setExpandedRegistryGroups] = useState<
    Set<string>
  >(
    () =>
      new Set([
        'DevOps & Infrastructure',
        'JavaScript Ecosystem',
        'Languages',
        'Python Ecosystem',
      ]),
  )

  // Fetch categories from API
  const { data: categories = [] } = useSuspenseQuery<Category[]>(
    categoriesQueryOptions(selectedRegistry),
  )

  // Fetch languages from API
  const { data: languages = [] } = useSuspenseQuery<string[]>(
    languagesQueryOptions(selectedRegistry),
  )

  // Filter registries by search
  const filteredRegistries = useMemo(() => {
    if (!registrySearch.trim()) {
      return registryNames
    }

    return registryNames.filter(name =>
      name.toLowerCase().includes(registrySearch.toLowerCase()),
    )
  }, [registryNames, registrySearch])

  // Group registries
  const groupedRegistries = useMemo(() => {
    return groupRegistries(filteredRegistries)
  }, [filteredRegistries])

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return categories
    }

    return categories.filter(cat =>
      cat.category.toLowerCase().includes(categorySearch.toLowerCase()),
    )
  }, [categories, categorySearch])

  // Filter languages by search
  const filteredLanguages = useMemo(() => {
    if (!languageSearch.trim()) {
      return languages
    }

    return languages.filter(lang =>
      lang.toLowerCase().includes(languageSearch.toLowerCase()),
    )
  }, [languages, languageSearch])

  // Get selected category display name
  const selectedCategoryName = useMemo(() => {
    if (!selectedFilters.category) return null
    const cat = categories.find(c => c.key === selectedFilters.category)
    return cat?.category || selectedFilters.category
  }, [selectedFilters.category, categories])

  const handleFilterChange = (
    key: keyof FilterValues,
    value: string | undefined,
  ) => {
    onFiltersChange({
      ...selectedFilters,
      [key]: value,
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const isExpanded = (section: string) => expandedSections.has(section)

  // Helper to render filter tags when collapsed
  const renderFilterTag = (label: string, onRemove: () => void) => (
    <div className="group/tag bg-accent/30 text-accent-foreground hover:bg-accent/50 mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all">
      <span className="truncate">{label}</span>
      <button
        className="hover:bg-primary/20 hover:text-primary rounded-full p-0.5 transition-all group-hover/tag:scale-110"
        onClick={e => {
          e.stopPropagation()
          onRemove()
        }}
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )

  return (
    <div className="bg-card/50 border-border/50 hidden h-full w-80 flex-col border-r backdrop-blur-sm md:flex">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Section Header - Editorial style */}
          <div className="mb-6">
            <h2 className="font-display text-foreground text-2xl font-bold tracking-tight">
              Filters
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm font-medium">
              Refine your discovery
            </p>
          </div>

          {/* Sort - Minimal pill buttons */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-foreground text-xs font-bold uppercase tracking-widest">
                Sort By
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Stars', value: 'stars' },
                { label: 'Recent', value: 'updated' },
                { label: 'A–Z', value: 'name' },
              ].map(option => (
                <button
                  className={`border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary rounded-xl border-2 px-4 py-2 text-xs font-semibold transition-all ${
                    selectedFilters.sort === option.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : ''
                  }`}
                  key={option.value}
                  onClick={() => {
                    handleFilterChange('sort', option.value)
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Registry with Enhanced Hierarchical Groups */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-foreground text-xs font-bold uppercase tracking-widest">
                Registry
              </span>
              <button
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                onClick={() => {
                  if (selectedFilters.registry) {
                    onFiltersChange({
                      ...selectedFilters,
                      category: undefined,
                      registry: undefined,
                    })
                  }
                }}
                type="button"
              >
                Reset
              </button>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
              <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                className="border-border/30 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 w-full rounded-xl border-2 px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-4"
                id="registry-search"
                onChange={e => {
                  setRegistrySearch(e.target.value)
                }}
                placeholder="Search registries..."
                type="text"
                value={registrySearch}
              />
            </div>

            {/* All Registries Option */}
            <button
              className={`mb-2 w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                !selectedFilters.registry
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
              onClick={() => {
                onFiltersChange({
                  ...selectedFilters,
                  category: undefined,
                  registry: undefined,
                })
              }}
              type="button"
            >
              All Registries
              <span className="text-muted-foreground/70 ml-2 text-xs font-normal">
                ({registryNames.length})
              </span>
            </button>

            {/* Grouped Registries with visual distinction */}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {Array.from(groupedRegistries.entries()).map(
                ([group, registries]) => {
                  if (registries.length === 0) return null

                  // Ungrouped registries
                  if (!group) {
                    return (
                      <div className="mt-3" key="ungrouped">
                        <span className="text-muted-foreground mb-2 block px-2 text-xs font-semibold uppercase tracking-wide">
                          Other
                        </span>
                        {registries.map(name => (
                          <button
                            className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                              selectedFilters.registry === name
                                ? 'bg-accent/50 text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted/30'
                            }`}
                            key={name}
                            onClick={() => {
                              onFiltersChange({
                                ...selectedFilters,
                                category: undefined,
                                registry: name,
                              })
                            }}
                            type="button"
                          >
                            {name.replace('awesome-', '')}
                          </button>
                        ))}
                      </div>
                    )
                  }

                  const isGroupExpanded = expandedRegistryGroups.has(
                    group.label,
                  )
                  const hasSelected = registries.some(
                    r => r === selectedFilters.registry,
                  )
                  const groupCount = registries.length

                  return (
                    <div className="group/registry" key={group.label}>
                      <button
                        className={`text-foreground hover:bg-muted/30 flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                          hasSelected
                            ? 'bg-accent/20 text-accent-foreground'
                            : ''
                        }`}
                        onClick={() => {
                          setExpandedRegistryGroups(prev => {
                            const next = new Set(prev)
                            if (next.has(group.label)) {
                              next.delete(group.label)
                            } else {
                              next.add(group.label)
                            }
                            return next
                          })
                        }}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-label={group.label}
                            className="text-lg"
                            role="img"
                          >
                            {group.icon}
                          </span>
                          <span>{group.label}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                            {groupCount}
                          </span>
                          <span className="bg-muted/50 rounded-md p-0.5">
                            {isGroupExpanded ? (
                              <Minus className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </span>
                        </span>
                      </button>

                      {isGroupExpanded && (
                        <div className="border-border/30 ml-1 mt-1.5 space-y-0.5 border-l-2 pl-3">
                          {registries.map(name => (
                            <button
                              className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                selectedFilters.registry === name
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                              }`}
                              key={name}
                              onClick={() => {
                                onFiltersChange({
                                  ...selectedFilters,
                                  category: undefined,
                                  registry: name,
                                })
                              }}
                              type="button"
                            >
                              {name.replace('awesome-', '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                },
              )}
            </div>

            {filteredRegistries.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No registries found
              </div>
            )}
          </div>

          {/* Categories - Enhanced visual design */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-bold"
              onClick={() => {
                toggleSection('categories')
              }}
              type="button"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Category
              </span>
              {isExpanded('categories') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('categories') &&
              selectedCategoryName &&
              renderFilterTag(selectedCategoryName, () => {
                handleFilterChange('category', undefined)
              })}
            {isExpanded('categories') && (
              <>
                <div className="relative mt-3">
                  <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    className="border-border/30 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 w-full rounded-xl border-2 px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-4"
                    id="category-search"
                    onChange={e => {
                      setCategorySearch(e.target.value)
                    }}
                    placeholder="Search categories..."
                    type="text"
                    value={categorySearch}
                  />
                </div>
                <div className="mt-2.5 max-h-56 space-y-0.5 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                          !selectedFilters.category
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted/20'
                        }`}
                        onClick={() => {
                          handleFilterChange('category', undefined)
                        }}
                        type="button"
                      >
                        All Categories
                      </button>
                      {filteredCategories.map(cat => (
                        <button
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                            selectedFilters.category === cat.key
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted/20'
                          }`}
                          key={cat.key}
                          onClick={() => {
                            const [registryName] = cat.key.split('::')
                            onFiltersChange({
                              ...selectedFilters,
                              category: cat.key,
                              registry: registryName,
                            })
                          }}
                          type="button"
                        >
                          <span className="truncate">{cat.category}</span>
                          <span className="bg-muted-foreground/10 text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                      No categories found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Language */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-bold"
              onClick={() => {
                toggleSection('language')
              }}
              type="button"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Language
              </span>
              {isExpanded('language') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('language') &&
              selectedFilters.lang &&
              renderFilterTag(selectedFilters.lang, () => {
                handleFilterChange('lang', undefined)
              })}
            {isExpanded('language') && (
              <>
                <div className="relative mt-3">
                  <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    className="border-border/30 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 w-full rounded-xl border-2 px-3 py-2.5 pl-9 text-sm transition-all focus:outline-none focus:ring-4"
                    id="language-search"
                    onChange={e => {
                      setLanguageSearch(e.target.value)
                    }}
                    placeholder="Search languages..."
                    type="text"
                    value={languageSearch}
                  />
                </div>
                <div className="mt-2.5 max-h-56 space-y-0.5 overflow-y-auto">
                  {filteredLanguages.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                          !selectedFilters.lang
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted/20'
                        }`}
                        onClick={() => {
                          handleFilterChange('lang', undefined)
                        }}
                        type="button"
                      >
                        All Languages
                      </button>
                      {filteredLanguages.map(lang => (
                        <button
                          className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                            selectedFilters.lang === lang
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted/20'
                          }`}
                          key={lang}
                          onClick={() => {
                            handleFilterChange('lang', lang)
                          }}
                          type="button"
                        >
                          {lang}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                      No languages found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stars Range - Custom slider-like appearance */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-bold"
              onClick={() => {
                toggleSection('stars')
              }}
              type="button"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Stars
              </span>
              {isExpanded('stars') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('stars') &&
              (selectedFilters.starsMin || selectedFilters.starsMax) &&
              renderFilterTag(
                `${selectedFilters.starsMin || '0'}+ stars`,
                () => {
                  handleFilterChange('starsMin', undefined)
                  handleFilterChange('starsMax', undefined)
                },
              )}
            {isExpanded('stars') && (
              <div className="mt-3 space-y-3">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '100+', min: '100' },
                    { label: '1K+', min: '1000' },
                    { label: '10K+', min: '10000' },
                  ].map(preset => (
                    <button
                      className={`border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedFilters.starsMin === preset.min
                          ? 'border-primary bg-primary/10 text-primary'
                          : ''
                      }`}
                      key={preset.label}
                      onClick={() => {
                        handleFilterChange('starsMin', preset.min)
                      }}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {/* Custom range */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    className="border-border/30 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 flex-1 rounded-xl border-2 px-3 py-2 text-center text-sm font-medium transition-all focus:outline-none focus:ring-4"
                    id="stars-min"
                    min="0"
                    onChange={e => {
                      handleFilterChange(
                        'starsMin',
                        e.target.value || undefined,
                      )
                    }}
                    placeholder="Min"
                    type="number"
                    value={selectedFilters.starsMin || ''}
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    className="border-border/30 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 flex-1 rounded-xl border-2 px-3 py-2 text-center text-sm font-medium transition-all focus:outline-none focus:ring-4"
                    min="0"
                    onChange={e => {
                      handleFilterChange(
                        'starsMax',
                        e.target.value || undefined,
                      )
                    }}
                    placeholder="Max"
                    type="number"
                    value={selectedFilters.starsMax || ''}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-bold"
              onClick={() => {
                toggleSection('date')
              }}
              type="button"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Updated
              </span>
              {isExpanded('date') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('date') &&
              (selectedFilters.dateFrom || selectedFilters.dateTo) &&
              renderFilterTag('Date filtered', () => {
                handleFilterChange('dateFrom', undefined)
                handleFilterChange('dateTo', undefined)
              })}
            {isExpanded('date') && (
              <div className="mt-3 space-y-2">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Week', weeks: 1 },
                    { label: 'Month', months: 1 },
                    { label: '3 Months', months: 3 },
                    { label: 'Year', months: 12 },
                  ].map(preset => (
                    <button
                      className={`border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                        (preset.weeks === 1 &&
                          selectedFilters.dateFrom === getDateWeeksAgo(1)) ||
                        (preset.months === 1 &&
                          selectedFilters.dateFrom === getDateMonthsAgo(1)) ||
                        (preset.months === 3 &&
                          selectedFilters.dateFrom === getDateMonthsAgo(3)) ||
                        (preset.months === 12 &&
                          selectedFilters.dateFrom === getDateMonthsAgo(12))
                          ? 'border-primary bg-primary/10 text-primary'
                          : ''
                      }`}
                      key={preset.label}
                      onClick={() => {
                        const date = preset.weeks
                          ? getDateWeeksAgo(preset.weeks)
                          : getDateMonthsAgo(preset.months ?? 1)
                        handleFilterChange('dateFrom', date)
                      }}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {/* Custom range */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    className="border-border/30 bg-card text-foreground hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-4"
                    id="date-from"
                    onChange={e => {
                      handleFilterChange(
                        'dateFrom',
                        e.target.value || undefined,
                      )
                    }}
                    placeholder="From"
                    type="date"
                    value={selectedFilters.dateFrom || ''}
                  />
                  <span className="text-muted-foreground text-xs">—</span>
                  <input
                    className="border-border/30 bg-card text-foreground hover:border-border/50 focus:border-primary/50 focus:ring-primary/10 flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-4"
                    onChange={e => {
                      handleFilterChange('dateTo', e.target.value || undefined)
                    }}
                    placeholder="To"
                    type="date"
                    value={selectedFilters.dateTo || ''}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="bg-muted/20 rounded-2xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-bold"
              onClick={() => {
                toggleSection('status')
              }}
              type="button"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Status
              </span>
              {isExpanded('status') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('status') &&
              selectedFilters.archived &&
              renderFilterTag(
                selectedFilters.archived === 'true' ? 'Archived' : 'Active',
                () => {
                  handleFilterChange('archived', undefined)
                },
              )}
            {isExpanded('status') && (
              <div className="mt-3 flex gap-2">
                {[
                  { label: 'All', value: '' },
                  { label: 'Active', value: 'false' },
                  { label: 'Archived', value: 'true' },
                ].map(option => (
                  <button
                    className={`flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-medium transition-all ${
                      selectedFilters.archived === option.value ||
                      (option.value === '' && !selectedFilters.archived)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/30 text-muted-foreground hover:bg-muted/30 border-2'
                    }`}
                    key={option.value}
                    onClick={() => {
                      handleFilterChange('archived', option.value || undefined)
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Button - Enhanced styling */}
      <div className="p-4 pt-0">
        <button
          className="border-border/30 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive w-full cursor-pointer rounded-2xl border-2 px-4 py-3 text-sm font-bold tracking-wide transition-all active:scale-95"
          onClick={() => {
            onFiltersChange({})
          }}
          type="button"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  )
}

// Helper functions for date presets
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
