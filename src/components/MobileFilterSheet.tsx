import { X } from 'lucide-react'

import type { FilterValues } from './SearchFilters'

interface MobileFilterSheetProps {
  filters: FilterValues
  onClose: () => void
  onFiltersChange: (filters: FilterValues) => void
  open: boolean
}

export function MobileFilterSheet({
  filters,
  onFiltersChange,
  open,
  onClose,
}: MobileFilterSheetProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="bg-background/60 fixed inset-0 z-40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose()
        }}
        role="presentation"
        tabIndex={-1}
      />

      {/* Sheet */}
      <div className="bg-card fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl border-t-2 shadow-2xl md:hidden">
        {/* Handle */}
        <div className="border-border flex items-center justify-between border-b p-4">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          <button
            className="text-muted-foreground hover:bg-muted rounded-full p-2 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters Content - same as SearchFilters but mobile */}
        <div className="overflow-y-auto p-4">
          {/* Sort options */}
          <div className="mb-6">
            <span className="text-muted-foreground mb-3 block text-xs font-bold uppercase tracking-wider">
              Sort By
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Popular', value: 'stars' },
                { label: 'Recently Updated', value: 'updated' },
                { label: 'A–Z', value: 'name' },
              ].map(option => (
                <button
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                    filters.sort === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground'
                  }`}
                  key={option.value}
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      sort: option.value as FilterValues['sort'],
                    })
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language options */}
          <div>
            <span className="text-muted-foreground mb-3 block text-xs font-bold uppercase tracking-wider">
              Language
            </span>
            <div className="space-y-1">
              <button
                className={`w-full rounded-lg px-3 py-3 text-left text-sm font-semibold transition-all ${
                  !filters.lang
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground'
                }`}
                onClick={() => {
                  onFiltersChange({ ...filters, lang: undefined })
                }}
                type="button"
              >
                All Languages
              </button>
              {['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'].map(
                lang => (
                  <button
                    className={`w-full rounded-lg px-3 py-3 text-left text-sm font-semibold transition-all ${
                      filters.lang?.toLowerCase() === lang.toLowerCase()
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted/50'
                    }`}
                    key={lang}
                    onClick={() => {
                      onFiltersChange({ ...filters, lang })
                    }}
                    type="button"
                  >
                    {lang}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
