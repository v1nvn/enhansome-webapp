import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { RegistryFile } from '@/types/registry'

interface RegistrySidebarProps {
  registries: Array<RegistryFile>
  selectedRegistry: string | null
  selectedCategory: string | null
  onRegistrySelect: (registry: string | null) => void
  onCategorySelect: (category: string) => void
}

export function RegistrySidebar({
  registries,
  selectedRegistry,
  selectedCategory,
  onRegistrySelect,
  onCategorySelect,
}: RegistrySidebarProps) {
  const [categorySearch, setCategorySearch] = useState('')

  // Get all categories with counts
  const allCategories = useMemo(() => {
    const categories = new Map<string, { count: number; registry: string }>()
    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        const key = `${registry.name}::${section.title}`
        categories.set(key, {
          count: section.items.length,
          registry: registry.name,
        })
      })
    })
    return categories
  }, [registries])

  // Filter categories by selected registry and search
  const filteredCategories = useMemo(() => {
    return Array.from(allCategories.entries())
      .filter(([key, meta]) => {
        // Filter by selected registry
        if (selectedRegistry && meta.registry !== selectedRegistry) {
          return false
        }
        // Filter by search
        if (categorySearch.trim()) {
          const [, categoryName] = key.split('::')
          return categoryName
            .toLowerCase()
            .includes(categorySearch.toLowerCase())
        }
        return true
      })
      .sort(([keyA], [keyB]) => {
        const [, nameA] = keyA.split('::')
        const [, nameB] = keyB.split('::')
        return nameA.localeCompare(nameB)
      })
  }, [allCategories, selectedRegistry, categorySearch])

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border-r border-slate-700">
      {/* Registries Section */}
      <div className="border-b border-slate-700">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Registries
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => onRegistrySelect(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedRegistry
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-300'
              }`}
            >
              All Registries
            </button>
            {registries.map((registry) => (
              <button
                key={registry.name}
                onClick={() => onRegistrySelect(registry.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedRegistry === registry.name
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{registry.name}</span>
                  <span className="text-xs text-gray-500">
                    {registry.data.items.length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Categories
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredCategories.length > 0 ? (
            <div className="space-y-0.5">
              {filteredCategories.map(([key, meta]) => {
                const [registry, categoryName] = key.split('::')
                return (
                  <button
                    key={key}
                    onClick={() => onCategorySelect(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === key
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'text-gray-400 hover:bg-slate-700/30 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{categoryName}</div>
                        {!selectedRegistry && (
                          <div className="text-xs text-gray-600 truncate">
                            {registry}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {meta.count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No categories found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 text-xs text-gray-500">
          {filteredCategories.length} categories
        </div>
      </div>
    </div>
  )
}
