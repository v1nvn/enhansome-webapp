import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type { RegistryFile } from '@/types/registry'

interface CategoryItem {
  key: string
  registry: string
  section: string
  count: number
}

interface CategorySidebarProps {
  registries: Array<RegistryFile>
  selectedCategory: string | null
  onCategorySelect: (key: string) => void
}

export function CategorySidebar({
  registries,
  selectedCategory,
  onCategorySelect,
}: CategorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedRegistries, setCollapsedRegistries] = useState<Set<string>>(
    new Set(),
  )

  // Build category list grouped by registry
  const categories = useMemo(() => {
    const items: Array<CategoryItem> = []
    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        items.push({
          key: `${registry.name}::${section.title}`,
          registry: registry.name,
          section: section.title,
          count: section.items.length,
        })
      })
    })
    return items
  }, [registries])

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const query = searchQuery.toLowerCase()
    return categories.filter((cat) =>
      cat.section.toLowerCase().includes(query),
    )
  }, [categories, searchQuery])

  // Group by registry for display
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, Array<CategoryItem>>()
    filteredCategories.forEach((cat) => {
      if (!groups.has(cat.registry)) {
        groups.set(cat.registry, [])
      }
      groups.get(cat.registry)!.push(cat)
    })
    return groups
  }, [filteredCategories])

  const toggleRegistry = (registry: string) => {
    setCollapsedRegistries((prev) => {
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
    <div className="h-full flex flex-col bg-slate-800/50 border-r border-slate-700">
      {/* Search */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(groupedCategories.entries()).map(([registry, cats]) => {
          const isCollapsed = collapsedRegistries.has(registry)
          return (
            <div key={registry} className="border-b border-slate-700/50">
              {/* Registry Header */}
              <button
                onClick={() => toggleRegistry(registry)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-semibold text-gray-300">
                    {registry}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{cats.length}</span>
              </button>

              {/* Categories under registry */}
              {!isCollapsed && (
                <div className="pb-2">
                  {cats.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => onCategorySelect(cat.key)}
                      className={`w-full px-4 py-2 pl-10 text-left text-sm transition-colors ${
                        selectedCategory === cat.key
                          ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-500'
                          : 'text-gray-400 hover:bg-slate-700/30 hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1">{cat.section}</span>
                        <span className="text-xs text-gray-500 ml-2">
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
      <div className="p-3 border-t border-slate-700 text-xs text-gray-500">
        {filteredCategories.length} categories
      </div>
    </div>
  )
}
