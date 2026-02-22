export type FilterPreset = 'active' | 'fresh' | 'popular' | 'trending'

export interface PresetConfig {
  description: string
  label: string
}

export const PRESET_CONFIGS: Record<FilterPreset, PresetConfig> = {
  trending: {
    label: 'Trending',
    description: 'Updated < 7 days, sorted by stars',
  },
  popular: {
    label: 'Popular',
    description: '1,000+ stars',
  },
  fresh: {
    label: 'Fresh',
    description: 'Updated < 3 months',
  },
  active: {
    label: 'Active',
    description: 'Updated < 6 months, not archived',
  },
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
