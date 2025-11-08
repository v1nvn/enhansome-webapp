import { useMemo, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

interface Category {
  category: string
  count: number
  key: string
  registry: string
}

interface RegistrySidebarProps {
  onCategorySelect: (category: string) => void
  onRegistrySelect: (registry: null | string) => void
  registryNames: string[]
  selectedCategory: null | string
  selectedRegistry: null | string
}

export function RegistrySidebar({
  onCategorySelect,
  onRegistrySelect,
  registryNames,
  selectedCategory,
  selectedRegistry,
}: RegistrySidebarProps) {
  const [categorySearch, setCategorySearch] = useState('')

  // Fetch categories from API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedRegistry) {
      params.append('registry', selectedRegistry)
    }
    return params.toString()
  }, [selectedRegistry])

  const { data: categories = [] } = useSuspenseQuery<Category[]>({
    queryFn: async () => {
      const url = queryParams
        ? `/api/categories?${queryParams}`
        : '/api/categories'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      return await response.json()
    },
    queryKey: ['categories', queryParams],
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return categories
    }

    return categories.filter(cat =>
      cat.category.toLowerCase().includes(categorySearch.toLowerCase()),
    )
  }, [categories, categorySearch])

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
              type="button"
            >
              All Registries
            </button>
            {registryNames.map(name => (
              <button
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedRegistry === name
                    ? 'bg-cyan-500/20 font-medium text-cyan-300'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-300'
                }`}
                key={name}
                onClick={() => {
                  onRegistrySelect(name)
                }}
                type="button"
              >
                <span className="truncate">{name}</span>
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
              {filteredCategories.map(cat => (
                <button
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedCategory === cat.key
                      ? 'bg-cyan-500/20 font-medium text-cyan-300'
                      : 'text-gray-400 hover:bg-slate-700/30 hover:text-gray-300'
                  }`}
                  key={cat.key}
                  onClick={() => {
                    onCategorySelect(cat.key)
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{cat.category}</div>
                      {!selectedRegistry && (
                        <div className="truncate text-xs text-gray-600">
                          {cat.registry}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      {cat.count}
                    </span>
                  </div>
                </button>
              ))}
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
