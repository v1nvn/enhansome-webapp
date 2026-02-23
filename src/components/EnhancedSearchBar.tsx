import { useMemo, useState } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { Search, Sparkles } from 'lucide-react'

import type { FilterPreset } from '@/lib/utils/filters'

import {
  type DetectedIntent,
  extractIntent,
  type IntentSignal,
} from '@/lib/utils/search'

export interface EnhancedSearchBarFilters {
  category?: string
  lang?: string
  preset?: FilterPreset
  registry?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}

interface EnhancedSearchBarProps {
  defaultValue?: string
  /**
   * Enable intent detection to automatically extract
   * framework, language, and category signals from query
   */
  enableIntentDetection?: boolean
  filters: EnhancedSearchBarFilters
  onFiltersChange?: (filters: EnhancedSearchBarFilters) => void
  /**
   * Callback to get search intent (for results count display)
   */
  onIntentChange?: (intent: DetectedIntent) => void
  onQueryChange?: (query: string) => void
  placeholder?: string
  /**
   * Show results count below detected signals
   */
  resultsCount?: number
  /**
   * Route to navigate to when submitting search or changing filters
   * Defaults to '/registry'
   */
  to?: string
}

export function EnhancedSearchBar({
  defaultValue = '',
  filters,
  onFiltersChange,
  placeholder = 'Search repositories...',
  enableIntentDetection = true,
  resultsCount,
  onIntentChange,
  onQueryChange,
  to = '/registry',
}: EnhancedSearchBarProps) {
  // onFiltersChange is used by parent for state management
  void onFiltersChange
  const [query, setQuery] = useState(defaultValue)
  const [detectedSignals, setDetectedSignals] = useState<IntentSignal[]>([])
  const navigate = useNavigate()

  // Extract intent from query
  const intent = useMemo(() => {
    if (!enableIntentDetection || !query.trim()) {
      return null
    }
    return extractIntent(query)
  }, [query, enableIntentDetection])

  // Notify parent of query changes
  const handleChange = (newQuery: string) => {
    setQuery(newQuery)
    onQueryChange?.(newQuery)
  }

  // Update detected signals when intent changes
  useMemo(() => {
    if (intent) {
      setDetectedSignals(intent.signals)
      onIntentChange?.(intent)
    } else {
      setDetectedSignals([])
    }
  }, [intent, onIntentChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    void navigate({
      to,
      search: trimmedQuery ? { q: trimmedQuery, ...filters } : { ...filters },
    })
  }

  const handleRemoveSignal = (signal: IntentSignal) => {
    // Remove the signal from the query by reconstructing it
    let newQuery = query
    const signalValue = signal.filterValue.toLowerCase()

    // Try to remove the signal term from query
    const patterns = [
      new RegExp(signalValue, 'gi'),
      new RegExp(signalValue.replace(/[-_]/g, ' '), 'gi'),
    ]
    for (const pattern of patterns) {
      if (pattern.test(newQuery)) {
        newQuery = newQuery.replace(pattern, ' ').trim()
        break
      }
    }

    handleChange(newQuery)
    setDetectedSignals(prev => prev.filter(s => s.id !== signal.id))
  }

  const formatLabel = (slug: string): string => {
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="group relative">
          <div className="bg-card/80 focus-within:ring-primary/30 group-hover:bg-card focus-within:shadow-primary/10 flex w-full items-center gap-3 rounded-2xl px-5 py-4 shadow-lg backdrop-blur-xl transition-all focus-within:ring-2">
            <Search className="text-muted-foreground/60 group-focus-within:text-primary h-5 w-5 shrink-0 transition-colors" />
            <input
              className="text-foreground placeholder:text-muted-foreground/50 min-w-[200px] flex-1 bg-transparent font-medium outline-none"
              onChange={e => {
                handleChange(e.target.value)
              }}
              placeholder={placeholder}
              type="text"
              value={query}
            />
            {query && (
              <button
                className="text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full p-1.5 transition-all"
                onClick={() => {
                  handleChange('')
                  setDetectedSignals([])
                  void navigate({ to, search: filters })
                }}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Detected Intent Signals */}
      {enableIntentDetection && detectedSignals.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {detectedSignals.map(signal => (
              <button
                className="bg-primary/10 text-primary hover:bg-primary/15 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium shadow-sm transition-all hover:shadow"
                key={`${signal.type}-${signal.id}`}
                onClick={() => {
                  handleRemoveSignal(signal)
                }}
                type="button"
              >
                {signal.label}
                <span className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  ×
                </span>
              </button>
            ))}
          </div>

          {/* Results count */}
          {resultsCount !== undefined && (
            <p className="text-muted-foreground text-sm">
              Found {resultsCount.toLocaleString()}
              {intent?.category && ` ${formatLabel(intent.category)}`}
              {intent?.framework && ` for ${formatLabel(intent.framework)}`}
              {intent?.language &&
                !intent.framework &&
                ` in ${intent.language}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
