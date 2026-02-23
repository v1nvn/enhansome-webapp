/**
 * Filter utilities and preset configurations
 */

import { getDateMonthsAgo, getDateWeeksAgo } from './date'

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
      return { archived: false, dateFrom: getDateMonthsAgo(6) }
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
