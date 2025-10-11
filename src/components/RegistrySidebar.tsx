import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'

import type { RegistryFile } from '@/types/registry'

interface RegistrySidebarProps {
  onCategorySelect: (category: string) => void
  onRegistrySelect: (registry: null | string) => void
  registries: RegistryFile[]
  selectedCategory: null | string
  selectedRegistry: null | string
}

export function RegistrySidebar({
  onCategorySelect,
  onRegistrySelect,
  registries,
  selectedCategory,
  selectedRegistry,
}: RegistrySidebarProps) {
  const [categorySearch, setCategorySearch] = useState('')

  // Get all categories with counts
  const allCategories = useMemo(() => {
    const categories = new Map<string, { count: number; registry: string }>()
    registries.forEach(registry => {
      registry.data.items.forEach(section => {
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
    <div className="flex h-full flex-col border-r border-slate-700 bg-slate-800/50">
      {/* Registries Section */}
      <div className="border-b border-slate-700">
        <div className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">
            Registries
          </h2>
          <div className="space-y-1">
            <button
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !selectedRegistry
                  ? 'bg-cyan-500/20 font-medium text-cyan-300'
                  : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-300'
              }`}
              onClick={() => {
                onRegistrySelect(null)
              }}
            >
              All Registries
            </button>
            {registries.map(registry => (
              <button
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedRegistry === registry.name
                    ? 'bg-cyan-500/20 font-medium text-cyan-300'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-300'
                }`}
                key={registry.name}
                onClick={() => {
                  onRegistrySelect(registry.name)
                }}
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-700 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">
            Categories
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
              onChange={e => {
                setCategorySearch(e.target.value)
              }}
              placeholder="Search categories..."
              type="text"
              value={categorySearch}
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
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === key
                        ? 'bg-cyan-500/20 font-medium text-cyan-300'
                        : 'text-gray-400 hover:bg-slate-700/30 hover:text-gray-300'
                    }`}
                    key={key}
                    onClick={() => {
                      onCategorySelect(key)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{categoryName}</div>
                        {!selectedRegistry && (
                          <div className="truncate text-xs text-gray-600">
                            {registry}
                          </div>
                        )}
                      </div>
                      <span className="ml-2 text-xs text-gray-500">
                        {meta.count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              No categories found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3 text-xs text-gray-500">
          {filteredCategories.length} categories
        </div>
      </div>
    </div>
  )
}
