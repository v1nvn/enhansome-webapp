import { X } from 'lucide-react'

import type { SidebarFilterItem } from '@/components/browse/SidebarFilterSection'

import { RegistryTagSidebar } from './RegistryTagSidebar'

interface RegistryMobileFilterPanelProps {
  categories: SidebarFilterItem[]
  isOpen: boolean
  onClearAll: () => void
  onClose: () => void
  registryName: string
  selectedCategory?: string
  selectedTag?: string
  tags: SidebarFilterItem[]
}

export function RegistryMobileFilterPanel({
  categories,
  isOpen,
  onClose,
  registryName,
  selectedCategory,
  selectedTag,
  tags,
}: RegistryMobileFilterPanelProps) {
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
          <RegistryTagSidebar
            categories={categories}
            registryName={registryName}
            selectedCategory={selectedCategory}
            selectedTag={selectedTag}
            tags={tags}
          />
        </div>
      </div>
    </>
  )
}
