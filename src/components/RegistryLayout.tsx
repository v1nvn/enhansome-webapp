import { useMemo } from 'react'
import { ItemsList } from './ItemsList'
import type { RegistryFile, RegistryItem } from '@/types/registry'

interface RegistryLayoutProps {
  registries: Array<RegistryFile>
  sortBy: 'stars' | 'updated' | 'name'
  minStars?: number
  hideArchived?: boolean
  selectedLanguage?: string
  searchQuery?: string
  selectedRegistry?: string
  selectedCategory?: string
}

export function RegistryLayout({
  registries,
  sortBy,
  minStars = 0,
  hideArchived = false,
  selectedLanguage,
  searchQuery,
  selectedRegistry,
  selectedCategory,
}: RegistryLayoutProps) {
  // Get all items across registries/categories based on filters
  const allItems = useMemo(() => {
    const items: Array<RegistryItem & { registry: string; category: string }> = []

    registries.forEach((registry) => {
      // Filter by registry if selected
      if (selectedRegistry && registry.name !== selectedRegistry) {
        return
      }

      registry.data.items.forEach((section) => {
        // Filter by category if selected
        const categoryKey = `${registry.name}::${section.title}`
        if (selectedCategory && categoryKey !== selectedCategory) {
          return
        }

        section.items.forEach((item) => {
          items.push({
            ...item,
            registry: registry.name,
            category: section.title,
          })
        })
      })
    })

    return items
  }, [registries, selectedRegistry, selectedCategory])

  // Apply filters and sorting
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Stars filter
      if (minStars && item.repo_info && item.repo_info.stars < minStars) {
        return false
      }

      // Archived filter
      if (hideArchived && item.repo_info?.archived) {
        return false
      }

      // Language filter
      if (selectedLanguage && item.repo_info?.language !== selectedLanguage) {
        return false
      }

      // Search filter
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase()
        const title = item.title.toLowerCase()
        const description = item.description?.toLowerCase() || ''
        const category = item.category.toLowerCase()
        const registry = item.registry.toLowerCase()
        if (
          !title.includes(query) &&
          !description.includes(query) &&
          !category.includes(query) &&
          !registry.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [allItems, minStars, hideArchived, selectedLanguage, searchQuery])

  // Get header text
  const headerText = useMemo(() => {
    if (selectedCategory) {
      const [, categoryName] = selectedCategory.split('::')
      return categoryName
    }
    if (selectedRegistry) {
      return selectedRegistry
    }
    return 'All Items'
  }, [selectedCategory, selectedRegistry])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="text-xl font-bold text-white">{headerText}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {filteredItems.length} items
        </p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden">
        <ItemsList
          items={filteredItems}
          selectedItem={null}
          onItemSelect={() => {
            // TODO: Open modal or navigate to detail page
          }}
          sortBy={sortBy}
        />
      </div>
    </div>
  )
}
