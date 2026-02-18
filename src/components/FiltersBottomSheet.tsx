import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'

import { groupRegistries } from '@/lib/registry-groups'
import {
  categoriesQueryOptions,
  type Category,
  languagesQueryOptions,
} from '@/lib/server-functions'

import type { FilterValues } from './FiltersSidebar'

interface FiltersBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onFiltersChange: (filters: FilterValues) => void
  registryNames: string[]
  selectedFilters: FilterValues
  selectedRegistry?: string
}

function FiltersBottomSheet({
  isOpen,
  onClose,
  onFiltersChange,
  registryNames,
  selectedFilters,
  selectedRegistry,
}: FiltersBottomSheetProps) {
  const [categorySearch, setCategorySearch] = useState('')
  const [languageSearch, setLanguageSearch] = useState('')
  const [registrySearch, setRegistrySearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['categories', 'language', 'registry', 'sort']),
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  // Fetch categories from API
  const { data: categories = [] } = useSuspenseQuery<Category[]>(
    categoriesQueryOptions(selectedRegistry),
  )

  // Fetch languages from API
  const { data: languages = [] } = useSuspenseQuery<string[]>(
    languagesQueryOptions(selectedRegistry),
  )

  // Filter registries by search
  const filteredRegistries = useMemo(
    () =>
      registrySearch.trim() === ''
        ? registryNames
        : registryNames.filter(name =>
            name.toLowerCase().includes(registrySearch.toLowerCase()),
          ),
    [registryNames, registrySearch],
  )

  // Group registries
  const groupedRegistries = useMemo(() => {
    return groupRegistries(filteredRegistries)
  }, [filteredRegistries])

  // Filter categories by search
  const filteredCategories =
    categorySearch.trim() === ''
      ? categories
      : categories.filter(cat =>
          cat.category.toLowerCase().includes(categorySearch.toLowerCase()),
        )

  // Filter languages by search
  const filteredLanguages =
    languageSearch.trim() === ''
      ? languages
      : languages.filter(lang =>
          lang.toLowerCase().includes(languageSearch.toLowerCase()),
        )

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

  // Close sheet on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Touch/drag handling for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      e.target === contentRef.current ||
      contentRef.current?.contains(e.target as Node)
    ) {
      // Only enable drag if at the top of scrollable content
      const target = e.target as HTMLElement
      if (target.scrollTop === 0) {
        setIsDragging(true)
        setStartY(e.touches[0].clientY)
        setCurrentY(0)
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const y = e.touches[0].clientY - startY
    if (y > 0) {
      setCurrentY(y)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    // If dragged more than 100px, close the sheet
    if (currentY > 100) {
      onClose()
    }
    setCurrentY(0)
  }

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Transform value for slide animation
  const transformValue = isDragging
    ? `translateY(${currentY}px)`
    : 'translateY(0)'
  const opacityValue = isDragging ? Math.max(0, 1 - currentY / 300) : 1

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={handleBackdropClick}
      onKeyUp={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleBackdropClick(e as unknown as React.MouseEvent)
        }
      }}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      role="presentation"
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        style={{ opacity: opacityValue }}
      />

      {/* Bottom Sheet */}
      <div
        className="bg-card relative max-h-[85vh] w-full rounded-t-3xl shadow-2xl transition-transform"
        ref={sheetRef}
        style={{
          transform: transformValue,
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pb-2 pt-3">
          <button
            className="hover:bg-muted-foreground/20 rounded-full p-2 transition-colors"
            onClick={onClose}
            type="button"
          >
            <div className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
          </button>
        </div>

        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 pb-4 pt-2">
          <div>
            <h2 className="font-display text-foreground text-xl font-bold">
              Filters
            </h2>
            <p className="text-muted-foreground text-sm">Refine your search</p>
          </div>
          <button
            className="hover:bg-muted rounded-lg p-2 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="text-foreground h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="overflow-y-auto px-6 pb-6 pt-4"
          ref={contentRef}
          style={{ maxHeight: 'calc(85vh - 120px)' }}
        >
          <div className="space-y-3">
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
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

            {/* Registry with Hierarchical Groups */}
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
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

                  {/* All Registries Option */}
                  <div className="mt-2">
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
                      All Registries ({registryNames.length})
                    </button>
                  </div>

                  {/* Grouped Registries */}
                  <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
                    {Array.from(groupedRegistries.entries()).map(
                      ([group, registries]) => {
                        if (registries.length === 0) return null

                        // Ungrouped registries
                        if (!group) {
                          return registries.map(name => (
                            <button
                              className={`ml-2 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
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
                          ))
                        }

                        const isGroupExpanded = expandedRegistryGroups.has(
                          group.label,
                        )
                        const hasSelected = registries.some(
                          r => r === selectedFilters.registry,
                        )
                        const groupCount = registries.length

                        return (
                          <div key={group.label}>
                            <button
                              className={`text-foreground hover:bg-accent/30 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                hasSelected ? 'bg-accent/50' : ''
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
                                <span>{group.icon}</span>
                                <span>{group.label}</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="bg-muted-foreground/20 rounded-full px-2 py-0.5 text-xs">
                                  {groupCount}
                                </span>
                                {isGroupExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                            </button>

                            {isGroupExpanded && (
                              <div className="ml-2 mt-1 space-y-0.5">
                                {registries.map(name => (
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
                              </div>
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>

                  {filteredRegistries.length === 0 && (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      No registries found
                    </div>
                  )}
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
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
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
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

            {/* Language */}
            <div className="bg-muted/30 rounded-xl p-4">
              <button
                className="text-foreground flex w-full cursor-pointer items-center justify-between text-sm font-semibold"
                onClick={() => {
                  toggleSection('language')
                }}
                type="button"
              >
                <span>Language</span>
                {isExpanded('language') ? (
                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
              {isExpanded('language') && (
                <>
                  <div className="relative mt-3">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border/50 focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 pl-9 text-sm transition-all focus:outline-none focus:ring-2"
                      id="language-search"
                      onChange={e => {
                        setLanguageSearch(e.target.value)
                      }}
                      placeholder="Search languages..."
                      type="text"
                      value={languageSearch}
                    />
                  </div>
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {filteredLanguages.length > 0 ? (
                      <>
                        <button
                          className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                            !selectedFilters.lang
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                            className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all ${
                              selectedFilters.lang === lang
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                      <div className="text-muted-foreground py-4 text-center text-sm">
                        No languages found
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
              {isExpanded('stars') && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="border-border/50 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
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
                  <span className="text-muted-foreground">—</span>
                  <input
                    className="border-border/50 bg-card text-foreground placeholder:text-muted-foreground/50 hover:border-border focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
              {isExpanded('date') && (
                <div className="mt-3 space-y-2">
                  <input
                    className="border-border/50 bg-card text-foreground hover:border-border focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2"
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
                  <ChevronDown className="text-muted-foreground h-4 w-4 rotate-[-90deg]" />
                )}
              </button>
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
        <div className="border-border border-t px-6 py-4">
          <button
            className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-95"
            onClick={() => {
              onFiltersChange({})
              onClose()
            }}
            type="button"
          >
            Reset All Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(FiltersBottomSheet)
