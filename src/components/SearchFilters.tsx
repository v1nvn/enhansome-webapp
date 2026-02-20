import { useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import type { FilterPreset } from '@/lib/filter-presets'

import { languagesQueryOptions } from '@/lib/server-functions'

export interface FilterValues {
  lang?: string
  preset?: FilterPreset
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

interface SearchFiltersProps {
  onFiltersChange: (filters: FilterValues) => void
  selectedFilters: FilterValues
}

const TOP_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'Ruby',
  'PHP',
  'Swift',
]

const QUICK_PRESETS = [
  { label: 'Best Match', filters: { sort: 'quality' as const } },
  { label: 'Popular', filters: { sort: 'stars' as const } },
  { label: 'Recently Updated', filters: { sort: 'updated' as const } },
  { label: 'A–Z', filters: { sort: 'name' as const } },
]

export function SearchFilters({
  onFiltersChange,
  selectedFilters,
}: SearchFiltersProps) {
  // Fetch languages from API
  const { data: languages = [] } = useSuspenseQuery<string[]>(
    languagesQueryOptions(selectedFilters.registry),
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

  const handleReset = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    selectedFilters.sort !== 'quality' ||
    !!selectedFilters.lang ||
    !!selectedFilters.registry

  return (
    <div className="bg-card/50 border-border/50 flex w-80 flex-col border-r">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-foreground text-xl font-bold">Filters</h2>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-muted-foreground mb-3 block text-xs font-bold uppercase tracking-wider">
              Sort By
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map(preset => (
                <button
                  className={`border-border text-muted-foreground hover:border-primary/50 hover:text-primary rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    selectedFilters.sort === preset.filters.sort
                      ? 'border-primary bg-primary text-primary-foreground'
                      : ''
                  }`}
                  key={preset.label}
                  onClick={() => {
                    handleFilterChange('sort', preset.filters.sort)
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Filter */}
          <div>
            <span className="text-muted-foreground mb-3 block text-xs font-bold uppercase tracking-wider">
              Language
            </span>
            <div className="space-y-1">
              <button
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  !selectedFilters.lang
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  handleFilterChange('lang', undefined)
                }}
                type="button"
              >
                All Languages
              </button>
              {TOP_LANGUAGES.filter(
                lang =>
                  !languages.length ||
                  languages.some(l => l.toLowerCase() === lang.toLowerCase()),
              ).map(lang => (
                <button
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                    selectedFilters.lang?.toLowerCase() === lang.toLowerCase()
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/30'
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
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="border-border/50 border-t p-4">
          <button
            className="border-border/30 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all"
            onClick={handleReset}
            type="button"
          >
            <X className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      )}
    </div>
  )
}
