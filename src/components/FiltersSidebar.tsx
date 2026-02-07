import { useMemo, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'

import type { Category } from '@/lib/server-functions'

import { categoriesQueryOptions } from '@/lib/server-functions'

export interface FilterValues {
  archived?: string
  category?: string
  dateFrom?: string
  dateTo?: string
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
  const [registrySearch, setRegistrySearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(),
  )

  // Fetch categories from API
  const { data: categories = [] } = useSuspenseQuery<Category[]>(
    categoriesQueryOptions(selectedRegistry),
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

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return categories
    }

    return categories.filter(cat =>
      cat.category.toLowerCase().includes(categorySearch.toLowerCase()),
    )
  }, [categories, categorySearch])

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
    <div className="group/tag bg-accent/30 text-foreground hover:bg-accent/50 mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all">
      <span className="truncate">{label}</span>
      <button
        className="hover:bg-primary/20 hover:text-primary rounded-md p-0.5 transition-all group-hover/tag:scale-110"
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

  const sortLabels = {
    name: 'Alphabetical',
    stars: 'Most Stars',
    updated: 'Recently Updated',
  }

  return (
    <div className="bg-card flex h-full w-80 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {/* Section Header */}
          <div className="mb-4">
            <h2 className="font-display text-foreground text-xl font-bold">
              Filters
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Refine your search
            </p>
          </div>

          {/* Sort */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('sort')
              }}
              type="button"
            >
              <span>Sort By</span>
              {isExpanded('sort') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('sort') &&
              selectedFilters.sort &&
              selectedFilters.sort !== 'stars' &&
              renderFilterTag(sortLabels[selectedFilters.sort], () => {
                handleFilterChange('sort', 'stars')
              })}
            {isExpanded('sort') && (
              <div className="mt-3 space-y-1.5">
                {[
                  { label: 'Most Stars', value: 'stars' },
                  { label: 'Recently Updated', value: 'updated' },
                  { label: 'Alphabetical', value: 'name' },
                ].map(option => (
                  <button
                    className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      selectedFilters.sort === option.value
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
            )}
          </div>

          {/* Registry */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('registry')
              }}
              type="button"
            >
              <span>Registry</span>
              {isExpanded('registry') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('registry') &&
              selectedFilters.registry &&
              renderFilterTag(selectedFilters.registry, () => {
                handleFilterChange('registry', undefined)
              })}
            {isExpanded('registry') && (
              <>
                <div className="relative mt-3">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 pl-9 text-sm transition-all focus:outline-none focus:ring-2"
                    id="registry-search"
                    onChange={e => {
                      setRegistrySearch(e.target.value)
                    }}
                    placeholder="Search registries..."
                    type="text"
                    value={registrySearch}
                  />
                </div>
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                  {filteredRegistries.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                          !selectedFilters.registry
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                      </button>
                      {filteredRegistries.map(name => (
                        <button
                          className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                            selectedFilters.registry === name
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                          {name}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      No registries found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Categories */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('categories')
              }}
              type="button"
            >
              <span>Category</span>
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
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 pl-9 text-sm transition-all focus:outline-none focus:ring-2"
                    id="category-search"
                    onChange={e => {
                      setCategorySearch(e.target.value)
                    }}
                    placeholder="Search categories..."
                    type="text"
                    value={categorySearch}
                  />
                </div>
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                          !selectedFilters.category
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                            selectedFilters.category === cat.key
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                          <span className="bg-muted-foreground/20 ml-2 rounded-full px-2 py-0.5 text-xs">
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      No categories found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stars Range */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('stars')
              }}
              type="button"
            >
              <span>Stars</span>
              {isExpanded('stars') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('stars') &&
              (selectedFilters.starsMin || selectedFilters.starsMax) &&
              renderFilterTag(
                `${selectedFilters.starsMin || '0'} - ${selectedFilters.starsMax || '∞'}`,
                () => {
                  handleFilterChange('starsMin', undefined)
                  handleFilterChange('starsMax', undefined)
                },
              )}
            {isExpanded('stars') && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  className="border-border/50 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
                  id="stars-min"
                  min="0"
                  onChange={e => {
                    handleFilterChange('starsMin', e.target.value || undefined)
                  }}
                  placeholder="Min"
                  type="number"
                  value={selectedFilters.starsMin || ''}
                />
                <span className="text-muted-foreground">—</span>
                <input
                  className="border-border/50 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
                  min="0"
                  onChange={e => {
                    handleFilterChange('starsMax', e.target.value || undefined)
                  }}
                  placeholder="Max"
                  type="number"
                  value={selectedFilters.starsMax || ''}
                />
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('date')
              }}
              type="button"
            >
              <span>Last Updated</span>
              {isExpanded('date') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('date') &&
              (selectedFilters.dateFrom || selectedFilters.dateTo) &&
              renderFilterTag(
                `${selectedFilters.dateFrom || '...'} - ${selectedFilters.dateTo || '...'}`,
                () => {
                  handleFilterChange('dateFrom', undefined)
                  handleFilterChange('dateTo', undefined)
                },
              )}
            {isExpanded('date') && (
              <div className="mt-3 space-y-2">
                <input
                  className="border-border/50 bg-card text-foreground hover:border-border focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
                  id="date-from"
                  onChange={e => {
                    handleFilterChange('dateFrom', e.target.value || undefined)
                  }}
                  placeholder="From"
                  type="date"
                  value={selectedFilters.dateFrom || ''}
                />
                <input
                  className="border-border/50 bg-card text-foreground hover:border-border focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
                  onChange={e => {
                    handleFilterChange('dateTo', e.target.value || undefined)
                  }}
                  placeholder="To"
                  type="date"
                  value={selectedFilters.dateTo || ''}
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="bg-muted/30 rounded-xl p-4">
            <button
              className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
              onClick={() => {
                toggleSection('status')
              }}
              type="button"
            >
              <span>Status</span>
              {isExpanded('status') ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            {!isExpanded('status') &&
              selectedFilters.archived &&
              renderFilterTag(
                selectedFilters.archived === 'true'
                  ? 'Archived Only'
                  : 'Active Only',
                () => {
                  handleFilterChange('archived', undefined)
                },
              )}
            {isExpanded('status') && (
              <select
                className="border-border/50 bg-card text-foreground hover:border-border focus:border-primary focus:ring-primary/20 mt-3 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
                id="status-select"
                onChange={e => {
                  handleFilterChange('archived', e.target.value || undefined)
                }}
                value={selectedFilters.archived || ''}
              >
                <option value="">All Projects</option>
                <option value="false">Active Only</option>
                <option value="true">Archived Only</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="p-4">
        <button
          className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground w-full cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
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
