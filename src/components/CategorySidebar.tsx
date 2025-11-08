import { useMemo, useState } from 'react'

import { ChevronDown, ChevronRight, Search } from 'lucide-react'

import type { RegistryFile } from '@/types/registry'

interface CategoryItem {
  count: number
  key: string
  registry: string
  section: string
}

interface CategorySidebarProps {
  onCategorySelect: (key: string) => void
  registries: RegistryFile[]
  selectedCategory: null | string
}

export function CategorySidebar({
  onCategorySelect,
  registries,
  selectedCategory,
}: CategorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedRegistries, setCollapsedRegistries] = useState<Set<string>>(
    () => new Set(),
  )

  // Build category list grouped by registry
  const categories = useMemo(() => {
    const items: CategoryItem[] = []
    registries.forEach(registry => {
      registry.data.items.forEach(section => {
        items.push({
          count: section.items.length,
          key: `${registry.name}::${section.title}`,
          registry: registry.name,
          section: section.title,
        })
      })
    })
    return items
  }, [registries])

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const query = searchQuery.toLowerCase()
    return categories.filter(cat => cat.section.toLowerCase().includes(query))
  }, [categories, searchQuery])

  // Group by registry for display
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, CategoryItem[]>()
    filteredCategories.forEach(cat => {
      if (!groups.has(cat.registry)) {
        groups.set(cat.registry, [])
      }
      const registryGroup = groups.get(cat.registry)
      if (registryGroup) {
        registryGroup.push(cat)
      }
    })
    return groups
  }, [filteredCategories])

  const toggleRegistry = (registry: string) => {
    setCollapsedRegistries(prev => {
      const next = new Set(prev)
      if (next.has(registry)) {
        next.delete(registry)
      } else {
        next.add(registry)
      }
      return next
    })
  }

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Search */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400 dark:text-gray-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
            onChange={e => {
              setSearchQuery(e.target.value)
            }}
            placeholder="Search categories..."
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(groupedCategories.entries()).map(([registry, cats]) => {
          const isCollapsed = collapsedRegistries.has(registry)
          return (
            <div className="border-b border-slate-200/50 dark:border-slate-700/50" key={registry}>
              {/* Registry Header */}
              <button
                className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/30"
                onClick={() => {
                  toggleRegistry(registry)
                }}
                type="button"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                    {registry}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-gray-500">{cats.length}</span>
              </button>

              {/* Categories under registry */}
              {!isCollapsed && (
                <div className="pb-2">
                  {cats.map(cat => (
                    <button
                      className={`w-full px-4 py-2 pl-10 text-left text-sm transition-colors ${
                        selectedCategory === cat.key
                          ? 'border-l-2 border-cyan-500 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-slate-700/30 dark:hover:text-gray-300'
                      }`}
                      key={cat.key}
                      onClick={() => {
                        onCategorySelect(cat.key)
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1 truncate">{cat.section}</span>
                        <span className="ml-2 text-xs text-slate-500 dark:text-gray-500">
                          {cat.count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-gray-500">
        {filteredCategories.length} categories
      </div>
    </div>
  )
}
