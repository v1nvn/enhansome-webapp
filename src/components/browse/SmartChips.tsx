import { Clock, Code, TrendingUp } from 'lucide-react'

import type { FilterOptions } from '@/lib/db/repositories/search-repository'

import { cn } from '@/lib/utils/cn'

import type { FilterBarFilters } from './FilterBar'

interface ChipDef {
  active: boolean
  apply: FilterBarFilters
  group: 'language' | 'popularity' | 'recency'
  icon: React.ReactNode
  label: string
}

interface SmartChipsProps {
  filterOptions?: FilterOptions
  filters: FilterBarFilters
  onFiltersChange: (filters: FilterBarFilters) => void
}

export function SmartChips({
  filterOptions,
  filters,
  onFiltersChange,
}: SmartChipsProps) {
  const chips: ChipDef[] = []

  // Language chips — top 4 by count
  if (filterOptions) {
    const topLangs = filterOptions.languages.slice(0, 4)
    for (const lang of topLangs) {
      const isActive = filters.lang === lang.name
      chips.push({
        group: 'language',
        icon: <Code className="h-3 w-3" />,
        label: lang.name,
        active: isActive,
        apply: { ...filters, lang: isActive ? undefined : lang.name },
      })
    }
  }

  // Recency chips
  const recencyOptions = [
    { label: 'This week', days: 7 },
    { label: 'This month', days: 30 },
  ]
  for (const opt of recencyOptions) {
    const dateFrom = daysAgo(opt.days)
    const isActive = filters.dateFrom === dateFrom
    chips.push({
      group: 'recency',
      icon: <Clock className="h-3 w-3" />,
      label: opt.label,
      active: isActive,
      apply: { ...filters, dateFrom: isActive ? undefined : dateFrom },
    })
  }

  // Popularity chips
  const popOptions = [
    { label: '1k+ stars', minStars: 1000 },
    { label: '5k+ stars', minStars: 5000 },
  ]
  for (const opt of popOptions) {
    const isActive = filters.minStars === opt.minStars
    chips.push({
      group: 'popularity',
      icon: <TrendingUp className="h-3 w-3" />,
      label: opt.label,
      active: isActive,
      apply: { ...filters, minStars: isActive ? undefined : opt.minStars },
    })
  }

  if (chips.length === 0) return null

  const groups = ['language', 'recency', 'popularity'] as const

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Quick filters
      </span>
      {groups.map((group, gi) => {
        const groupChips = chips.filter(c => c.group === group)
        if (groupChips.length === 0) return null
        return (
          <div className="contents" key={group}>
            {gi > 0 && <span className="mx-1 h-4 w-px bg-border/50" />}
            {groupChips.map(chip => (
              <button
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
                  chip.active
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/60 hover:text-foreground hover:shadow-md',
                )}
                key={chip.label}
                onClick={() => {
                  onFiltersChange(chip.apply)
                }}
                type="button"
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}
