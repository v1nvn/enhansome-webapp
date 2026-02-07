import { useMemo } from 'react'

import { X } from 'lucide-react'

import type { FilterValues } from './FiltersSidebar'

interface ActiveFilterChipsProps {
  filters: FilterValues
  onRemoveFilter: (key: keyof FilterValues) => void
  onClearAll: () => void
}

function ActiveFilterChips({ filters, onRemoveFilter, onClearAll }: ActiveFilterChipsProps) {
  const activeFilters = useMemo(() => {
    const chips: Array<{ key: keyof FilterValues; label: string; value: string }> = []

    if (filters.sort && filters.sort !== 'stars') {
      chips.push({
        key: 'sort',
        label: 'Sort',
        value: filters.sort === 'name' ? 'A-Z' : filters.sort === 'updated' ? 'Updated' : 'Stars',
      })
    }

    if (filters.registry) {
      chips.push({
        key: 'registry',
        label: 'Registry',
        value: filters.registry,
      })
    }

    if (filters.category) {
      // Extract just the category name (format: "registry::category")
      const categoryName = filters.category.split('::').pop() || filters.category
      chips.push({
        key: 'category',
        label: 'Category',
        value: categoryName,
      })
    }

    if (filters.lang) {
      chips.push({
        key: 'lang',
        label: 'Language',
        value: filters.lang,
      })
    }

    if (filters.starsMin || filters.starsMax) {
      chips.push({
        key: 'stars',
        label: 'Stars',
        value: `${filters.starsMin || '0'}-${filters.starsMax || '∞'}`,
      })
    }

    if (filters.dateFrom || filters.dateTo) {
      chips.push({
        key: 'date',
        label: 'Updated',
        value: `${filters.dateFrom || '...'} - ${filters.dateTo || '...'}`,
      })
    }

    if (filters.archived) {
      chips.push({
        key: 'archived',
        label: 'Status',
        value: filters.archived === 'true' ? 'Archived' : 'Active',
      })
    }

    return chips
  }, [filters])

  if (activeFilters.length === 0) return null

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {activeFilters.map(chip => (
          <button
            className="bg-accent/50 hover:bg-accent/70 text-foreground group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            key={chip.key}
            onClick={() => onRemoveFilter(chip.key)}
            type="button"
          >
            <span className="text-muted-foreground">{chip.label}:</span>
            <span className="max-w-[120px] truncate">{chip.value}</span>
            <X className="text-muted-foreground group-hover:text-foreground ml-0.5 h-3 w-3 transition-colors" />
          </button>
        ))}

        {activeFilters.length > 1 && (
          <button
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
            onClick={onClearAll}
            type="button"
          >
            <X className="h-3 w-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ActiveFilterChips
