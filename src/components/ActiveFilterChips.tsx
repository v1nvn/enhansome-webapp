import { X } from 'lucide-react'

import type { FilterPreset } from '@/lib/filter-presets'

import { PRESET_CONFIGS } from '@/lib/filter-presets'

interface ActiveFilterChipsProps {
  filters: {
    lang?: string
    preset?: FilterPreset
    registry?: string
    sort?: 'name' | 'quality' | 'stars' | 'updated'
  }
  onClearAll: () => void
  onRemoveFilter: (key: string) => void
}

export function ActiveFilterChips({
  filters,
  onClearAll,
  onRemoveFilter,
}: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; value: string }[] = []

  // Preset filter
  if (filters.preset) {
    chips.push({
      key: 'preset',
      label: '',
      value: PRESET_CONFIGS[filters.preset].label,
    })
  }

  // Language filter
  if (filters.lang) {
    chips.push({
      key: 'lang',
      label: 'Language',
      value: filters.lang,
    })
  }

  // Registry filter
  if (filters.registry) {
    chips.push({
      key: 'registry',
      label: 'Registry',
      value: filters.registry.replace('awesome-', ''),
    })
  }

  // Sort filter (only if not default)
  if (filters.sort && filters.sort !== 'quality') {
    const sortLabels = {
      name: 'A–Z',
      stars: 'Popular',
      updated: 'Recent',
      quality: 'Best Match',
    } as const
    chips.push({
      key: 'sort',
      label: 'Sort',
      value: sortLabels[filters.sort],
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(chip => (
        <button
          className="bg-accent/50 hover:bg-accent/70 text-accent-foreground group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all"
          key={chip.key}
          onClick={() => {
            onRemoveFilter(chip.key)
          }}
          type="button"
        >
          {chip.label && (
            <span className="text-muted-foreground">{chip.label}:</span>
          )}
          <span>{chip.value}</span>
          <X className="text-muted-foreground group-hover:text-foreground ml-0.5 h-3 w-3 transition-colors" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          className="border-border hover:bg-muted hover:text-foreground text-muted-foreground flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all"
          onClick={onClearAll}
          type="button"
        >
          <X className="h-3 w-3" />
          Clear all
        </button>
      )}
    </div>
  )
}
