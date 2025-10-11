import { useMemo } from 'react'

import type { RegistryFile, RegistryItem } from '@/types/registry'

import { ItemsList } from './ItemsList'

interface RegistryLayoutProps {
  hideArchived?: boolean
  minStars?: number
  registries: RegistryFile[]
  searchQuery?: string
  selectedCategory?: string
  selectedLanguage?: string
  selectedRegistry?: string
  sortBy: 'name' | 'stars' | 'updated'
}

export function RegistryLayout({
  hideArchived = false,
  minStars = 0,
  registries,
  searchQuery,
  selectedCategory,
  selectedLanguage,
  selectedRegistry,
  sortBy,
}: RegistryLayoutProps) {
  // Get all items across registries/categories based on filters
  const allItems = useMemo(() => {
    const items: (RegistryItem & { category: string; registry: string })[] = []

    registries.forEach(registry => {
      // Filter by registry if selected
      if (selectedRegistry && registry.name !== selectedRegistry) {
        return
      }

      registry.data.items.forEach(section => {
        // Filter by category if selected
        const categoryKey = `${registry.name}::${section.title}`
        if (selectedCategory && categoryKey !== selectedCategory) {
          return
        }

        section.items.forEach(item => {
          items.push({
            ...item,
            category: section.title,
            registry: registry.name,
          })
        })
      })
    })

    return items
  }, [registries, selectedRegistry, selectedCategory])

  // Apply filters and sorting
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
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
      <div className="border-b border-slate-700 bg-slate-800/50 p-4">
        <h2 className="text-xl font-bold text-white">{headerText}</h2>
        <p className="mt-1 text-sm text-gray-400">
          {filteredItems.length} items
        </p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden">
        <ItemsList
          items={filteredItems}
          onItemSelect={() => {
            // TODO: Open modal or navigate to detail page
          }}
          selectedItem={null}
          sortBy={sortBy}
        />
      </div>
    </div>
  )
}
