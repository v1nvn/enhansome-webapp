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
    new Set(),
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
    <div className="group/tag mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 transition-all duration-200 ease-in-out hover:bg-white hover:shadow-sm">
      <span className="truncate">{label}</span>
      <button
        className="cursor-pointer rounded p-0.5 transition-all duration-200 ease-in-out hover:bg-red-50 group-hover/tag:scale-110"
        onClick={e => {
          e.stopPropagation()
          onRemove()
        }}
        type="button"
      >
        <X className="h-3 w-3 transition-colors duration-200 ease-in-out group-hover/tag:text-red-600 group-hover/tag:font-bold" />
      </button>
    </div>
  )

  const sortLabels = {
    name: 'Alphabetical',
    stars: 'Most Stars',
    updated: 'Recently Updated',
  }

  return (
    <div className="flex h-full w-72 flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Sort */}
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('sort')
              }}
              type="button"
            >
              <span>Sort By</span>
              {isExpanded('sort') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {!isExpanded('sort') &&
              selectedFilters.sort &&
              selectedFilters.sort !== 'stars' &&
              renderFilterTag(
                sortLabels[selectedFilters.sort],
                () => handleFilterChange('sort', 'stars'),
              )}
            {isExpanded('sort') && (
              <div className="mt-3 space-y-2">
                {[
                  { label: 'Most Stars', value: 'stars' },
                  { label: 'Recently Updated', value: 'updated' },
                  { label: 'Alphabetical', value: 'name' },
                ].map(option => (
                  <button
                    className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ease-in-out ${
                      selectedFilters.sort === option.value
                        ? 'bg-indigo-100 font-medium text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm'
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
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('registry')
              }}
              type="button"
            >
              <span>Registry</span>
              {isExpanded('registry') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {!isExpanded('registry') &&
              selectedFilters.registry &&
              renderFilterTag(selectedFilters.registry, () =>
                handleFilterChange('registry', undefined),
              )}
            {isExpanded('registry') && (
              <>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400 transition-colors duration-150" />
                  <input
                    className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out placeholder:text-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    id="registry-search"
                    onChange={e => {
                      setRegistrySearch(e.target.value)
                    }}
                    placeholder="Search..."
                    type="text"
                    value={registrySearch}
                  />
                </div>
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                  {filteredRegistries.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ease-in-out ${
                          !selectedFilters.registry
                            ? 'bg-indigo-100 font-medium text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
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
                          className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ease-in-out ${
                            selectedFilters.registry === name
                              ? 'bg-indigo-100 font-medium text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
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
                    <div className="py-4 text-center text-sm text-slate-500">
                      No registries found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Categories */}
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('categories')
              }}
              type="button"
            >
              <span>Category</span>
              {isExpanded('categories') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {!isExpanded('categories') &&
              selectedCategoryName &&
              renderFilterTag(selectedCategoryName, () =>
                handleFilterChange('category', undefined),
              )}
            {isExpanded('categories') && (
              <>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400 transition-colors duration-150" />
                  <input
                    className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out placeholder:text-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    id="category-search"
                    onChange={e => {
                      setCategorySearch(e.target.value)
                    }}
                    placeholder="Search..."
                    type="text"
                    value={categorySearch}
                  />
                </div>
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    <>
                      <button
                        className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ease-in-out ${
                          !selectedFilters.category
                            ? 'bg-indigo-100 font-medium text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
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
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ease-in-out ${
                            selectedFilters.category === cat.key
                              ? 'bg-indigo-100 font-medium text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
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
                          <span className="ml-2 text-xs text-slate-500">
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="py-4 text-center text-sm text-slate-500">
                      No categories found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stars Range */}
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('stars')
              }}
              type="button"
            >
              <span>Stars</span>
              {isExpanded('stars') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
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
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out placeholder:text-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="stars-min"
                  min="0"
                  onChange={e => {
                    handleFilterChange('starsMin', e.target.value || undefined)
                  }}
                  placeholder="Min"
                  type="number"
                  value={selectedFilters.starsMin || ''}
                />
                <span className="text-slate-400">—</span>
                <input
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out placeholder:text-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('date')
              }}
              type="button"
            >
              <span>Last Updated</span>
              {isExpanded('date') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
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
                  className="w-full cursor-pointer rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="date-from"
                  onChange={e => {
                    handleFilterChange('dateFrom', e.target.value || undefined)
                  }}
                  placeholder="From"
                  type="date"
                  value={selectedFilters.dateFrom || ''}
                />
                <input
                  className="w-full cursor-pointer rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="rounded-xl bg-slate-50 p-4">
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-slate-900"
              onClick={() => {
                toggleSection('status')
              }}
              type="button"
            >
              <span>Status</span>
              {isExpanded('status') ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {!isExpanded('status') &&
              selectedFilters.archived &&
              renderFilterTag(
                selectedFilters.archived === 'true'
                  ? 'Archived Only'
                  : 'Active Only',
                () => handleFilterChange('archived', undefined),
              )}
            {isExpanded('status') && (
              <select
                className="mt-3 w-full cursor-pointer rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-indigo-700 hover:shadow-md active:scale-95"
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
