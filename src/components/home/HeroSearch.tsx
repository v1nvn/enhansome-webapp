import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Clock, Search, Tag, X } from 'lucide-react'

import { metadataQueryOptions } from '@/lib/server-functions'

interface HeroSearchProps {
  className?: string
}

const RECENT_SEARCHES_KEY = 'enhansome-recent-searches'

export function HeroSearch({ className = '' }: HeroSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof globalThis.window === 'undefined') return []
    try {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      const stored = globalThis.localStorage.getItem(RECENT_SEARCHES_KEY)
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })

  const { data: registries } = useQuery(metadataQueryOptions())

  // Filter suggestions based on query
  const suggestions = query.trim()
    ? [
        // Match registries
        ...(registries
          ?.filter(
            r =>
              r.name.toLowerCase().includes(query.toLowerCase()) ||
              r.title.toLowerCase().includes(query.toLowerCase()),
          )
          .map(r => ({
            type: 'registry' as const,
            title: r.title,
            subtitle: r.name,
            value: r.name,
          })) ?? []),
        // Match categories (from registry data)
        ...(registries?.flatMap(r => r.stats.categories ?? []) ?? [])
          .filter(
            (cat, _, arr) =>
              arr.indexOf(cat) === arr.lastIndexOf(cat) && // unique
              cat.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 5)
          .map(cat => ({
            type: 'category' as const,
            title: cat,
            subtitle: 'Category',
            value: cat,
          })),
      ].slice(0, 8)
    : recentSearches.slice(0, 5).map(search => ({
        type: 'recent' as const,
        title: search,
        subtitle: 'Recent search',
        value: search,
      }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query.trim())
    }
  }

  const performSearch = (searchTerm: string) => {
    // Update recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchTerm)
      const updated = [searchTerm, ...filtered].slice(0, 5)
      try {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        globalThis.localStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        )
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })

    // Navigate to registry page with search
    void navigate({
      to: '/registry',
      search: { q: searchTerm },
    })
    setShowSuggestions(false)
    setQuery('')
    setFocusedIndex(-1)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      globalThis.localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0) {
          performSearch(suggestions[focusedIndex]?.value ?? '')
        } else if (query.trim()) {
          performSearch(query.trim())
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setFocusedIndex(-1)
        break
    }
  }

  return (
    <div className={`relative ${className}`}>
      <form className="group relative" onSubmit={handleSubmit}>
        {/* Decorative border glow on focus */}
        <div className="from-primary/20 via-accent/20 to-primary/20 absolute -inset-0.5 rounded-[26px] bg-gradient-to-r opacity-0 blur-sm transition-opacity duration-500 group-focus-within:opacity-100" />

        {/* Search Input Container */}
        <div className="relative">
          {/* Animated search icon */}
          <div className="absolute left-6 top-1/2 z-10 -translate-y-1/2">
            <Search className="text-muted-foreground/70 group-focus-within:text-primary h-5 w-5 transition-all duration-300 group-focus-within:scale-110" />
          </div>

          {/* Input field with enhanced styling */}
          <div className="relative">
            <input
              className="border-border/80 bg-card/95 placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-primary/10 w-full rounded-2xl border py-5 pl-16 pr-14 text-lg shadow-xl backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-8"
              onBlur={() => {
                // Delay hiding to allow click on suggestions
                setTimeout(() => {
                  setShowSuggestions(false)
                }, 200)
              }}
              onChange={e => {
                setQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => {
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              placeholder="What are you looking for?"
              type="text"
              value={query}
            />

            {/* Character count indicator */}
            {query && (
              <span className="text-muted-foreground/50 absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums">
                {query.length}
              </span>
            )}
          </div>

          {/* Clear button with animation */}
          {query && (
            <button
              className="bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground absolute right-5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 scale-75 items-center justify-center rounded-full opacity-0 transition-all duration-200 focus:scale-100 focus:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
              onClick={() => {
                setQuery('')
                setFocusedIndex(-1)
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick search hints */}
        {!query && !showSuggestions && (
          <div className="text-muted-foreground/60 absolute -bottom-8 left-16 flex gap-4 text-xs">
            <span>Try "javascript" or "machine learning"</span>
          </div>
        )}
      </form>

      {/* Suggestions Dropdown with enhanced design */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border-border/80 bg-card/95 shadow-primary/5 animate-in slide-in-from-top-2 absolute z-50 mt-3 w-full overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md duration-200">
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {query === '' && recentSearches.length > 0 && (
              <li className="border-border/50 px-5 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Recent
                  </span>
                  <button
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                    onClick={clearRecentSearches}
                    type="button"
                  >
                    <span>Clear</span>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            )}
            {suggestions.map((suggestion, index) => {
              const isFocused = focusedIndex === index
              return (
                <li key={`${suggestion.type}-${suggestion.value}`}>
                  <Link
                    className={`group flex items-center justify-between gap-3 px-5 py-3.5 transition-all duration-150 ${
                      isFocused
                        ? 'bg-primary/5 text-foreground'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      performSearch(suggestion.value)
                    }}
                    search={{ q: suggestion.value }}
                    to="/registry"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Icon based on type */}
                      <span
                        className={`shrink-0 transition-colors ${
                          isFocused
                            ? 'text-primary'
                            : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                        }`}
                      >
                        {suggestion.type === 'recent' && (
                          <Clock className="h-4 w-4" />
                        )}
                        {suggestion.type === 'category' && (
                          <Tag className="h-4 w-4" />
                        )}
                        {suggestion.type === 'registry' && (
                          <Search className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${
                            isFocused ? 'text-foreground' : ''
                          }`}
                        >
                          {suggestion.title}
                        </p>
                        <p
                          className={`truncate text-sm ${
                            isFocused
                              ? 'text-muted-foreground/80'
                              : 'text-muted-foreground/60'
                          }`}
                        >
                          {suggestion.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Type badge */}
                    {suggestion.type === 'registry' && (
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                          isFocused
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted/50 text-muted-foreground border-border/50'
                        }`}
                      >
                        Registry
                      </span>
                    )}

                    {/* Keyboard hint for first item when empty query */}
                    {query === '' && index === 0 && (
                      <kbd
                        className={`hidden shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors sm:inline-flex ${
                          isFocused
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        ↵
                      </kbd>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Footer hint */}
          <div className="border-border/50 bg-muted/30 text-muted-foreground/60 flex items-center justify-between px-5 py-2 text-[10px]">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  )
}
