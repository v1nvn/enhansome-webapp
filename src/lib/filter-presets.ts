import type { FilterValues } from '@/components/SearchFilters'

export type FilterPreset = 'active' | 'fresh' | 'popular' | 'trending'

export interface PresetConfig {
  description: string
  filters: Partial<FilterValues> & { preset?: FilterPreset }
  label: string
}

export const PRESET_CONFIGS: Record<FilterPreset, PresetConfig> = {
  trending: {
    label: 'Trending',
    description: 'Updated < 7 days, sorted by stars',
    filters: { preset: 'trending' }, // Date filtering handled in search
  },
  popular: {
    label: 'Popular',
    description: '1,000+ stars',
    filters: { preset: 'popular' }, // Min stars handled in search
  },
  fresh: {
    label: 'Fresh',
    description: 'Updated < 3 months',
    filters: { preset: 'fresh' },
  },
  active: {
    label: 'Active',
    description: 'Updated < 6 months, not archived',
    filters: { preset: 'active' },
  },
}

export function getPresetFilters(preset: FilterPreset): Partial<FilterValues> {
  return PRESET_CONFIGS[preset].filters
}

export function presetToSearchParams(preset: FilterPreset | undefined): {
  archived?: boolean
  dateFrom?: string
  minStars?: number
} {
  switch (preset) {
    case 'active':
      return { dateFrom: getDateMonthsAgo(6), archived: false }
    case 'fresh':
      return { dateFrom: getDateMonthsAgo(3) }
    case 'popular':
      return { minStars: 1000 }
    case 'trending':
      return { dateFrom: getDateWeeksAgo(1) }
    default:
      return {}
  }
}

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
