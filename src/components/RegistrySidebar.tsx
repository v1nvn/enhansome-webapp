import { useMemo, useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import type { Category } from '@/lib/server-functions'

import { categoriesQueryOptions } from '@/lib/server-functions'

interface RegistrySidebarProps {
  registryNames: string[]
  selectedCategory: null | string
  selectedRegistry: null | string
}

export function RegistrySidebar({
  registryNames,
  selectedCategory,
  selectedRegistry,
}: RegistrySidebarProps) {
  const [categorySearch, setCategorySearch] = useState('')

  // Fetch categories from API
  const { data: categories = [] } = useSuspenseQuery<Category[]>(
    categoriesQueryOptions(selectedRegistry ?? undefined),
  )

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
    <div className="flex h-full flex-col border-r border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Registries Section */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
            Registries
          </h2>
          <div className="space-y-1">
            <Link
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !selectedRegistry
                  ? 'bg-cyan-500/20 font-medium text-cyan-600 dark:text-cyan-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
              }`}
              search={prev => ({
                ...prev,
                category: undefined,
                registry: undefined,
              })}
              to="."
            >
              All Registries
            </Link>
            {registryNames.map(name => (
              <Link
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedRegistry === name
                    ? 'bg-cyan-500/20 font-medium text-cyan-600 dark:text-cyan-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-slate-700/50 dark:hover:text-gray-300'
                }`}
                key={name}
                search={prev => ({
                  ...prev,
                  category: undefined,
                  registry: name,
                })}
                to="."
              >
                <span className="truncate">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
            Categories
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400 dark:text-gray-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
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
              {filteredCategories.map(cat => {
                // Extract registry name from category key (format: "registry::category")
                const [registryName] = cat.key.split('::')
                return (
                  <Link
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === cat.key
                        ? 'bg-cyan-500/20 font-medium text-cyan-600 dark:text-cyan-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-slate-700/30 dark:hover:text-gray-300'
                    }`}
                    key={cat.key}
                    search={prev => ({
                      ...prev,
                      category: cat.key,
                      registry: registryName,
                    })}
                    to="."
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{cat.category}</div>
                        {!selectedRegistry && (
                          <div className="truncate text-xs text-slate-500 dark:text-gray-600">
                            {cat.registry}
                          </div>
                        )}
                      </div>
                      <span className="ml-2 text-xs text-slate-500 dark:text-gray-500">
                        {cat.count}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-gray-500">
              No categories found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-gray-500">
          {filteredCategories.length} categories
        </div>
      </div>
    </div>
  )
}
