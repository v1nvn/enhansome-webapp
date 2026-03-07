import { X } from 'lucide-react'

import type { FilterOptions } from '@/lib/db/repositories/search-repository'

import { CategorySidebar } from './CategorySidebar'

interface MobileFilterPanelProps {
  filterOptions: FilterOptions
  isOpen: boolean
  onClearAll: () => void
  onClose: () => void
  selectedCategory?: string
  selectedLanguage?: string
  selectedRegistry?: string
}

export function MobileFilterPanel({
  filterOptions,
  isOpen,
  onClose,
  selectedCategory,
  selectedRegistry,
  selectedLanguage,
}: MobileFilterPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <button
        aria-label="Close filter panel"
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border/30 bg-background px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <CategorySidebar
            filterOptions={filterOptions}
            selectedCategory={selectedCategory}
            selectedLanguage={selectedLanguage}
            selectedRegistry={selectedRegistry}
          />
        </div>
      </div>
    </>
  )
}
