import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ChevronsDown, ChevronsUp, Filter, Search, Star } from 'lucide-react'
import type { RegistryFile, RegistryItem, RegistrySection } from '@/types/registry'
import { RegistrySection as RegistrySectionComponent } from '@/components/RegistrySection'

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
})

function RegistryBrowser() {
  const { data: registries } = useSuspenseQuery<Array<RegistryFile>>({
    queryKey: ['registry'],
    queryFn: async () => {
      const response = await fetch('/api/registry')
      if (!response.ok) {
        throw new Error('Failed to fetch registry data')
      }
      return response.json()
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegistry, setSelectedRegistry] = useState<string>('all')
  const [minStars, setMinStars] = useState(0)
  const [hideArchived, setHideArchived] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [expandAll, setExpandAll] = useState(true)

  // Get unique languages
  const languages = useMemo(() => {
    const langs = new Set<string>()
    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        section.items.forEach((item) => {
          if (item.repo_info?.language) {
            langs.add(item.repo_info.language)
          }
        })
      })
    })
    return Array.from(langs).sort()
  }, [registries])

  // Filter function for individual items
  const filterItem = (item: RegistryItem): boolean => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const title = item.title.toLowerCase()
      const description = item.description?.toLowerCase() || ''
      if (!title.includes(query) && !description.includes(query)) {
        return false
      }
    }

    // Stars filter
    if (item.repo_info && item.repo_info.stars < minStars) {
      return false
    }

    // Archived filter
    if (hideArchived && item.repo_info?.archived) {
      return false
    }

    // Language filter
    if (
      selectedLanguage !== 'all' &&
      item.repo_info?.language !== selectedLanguage
    ) {
      return false
    }

    return true
  }

  // Recursively filter items including children
  const filterItemRecursive = (item: RegistryItem): RegistryItem | null => {
    const filteredChildren = item.children
      .map(filterItemRecursive)
      .filter((child): child is RegistryItem => child !== null)

    // Include item if it matches filters OR has matching children
    if (filterItem(item) || filteredChildren.length > 0) {
      return {
        ...item,
        children: filteredChildren,
      }
    }

    return null
  }

  // Filter sections and items while preserving structure
  const filteredSections = useMemo(() => {
    const result: Array<{
      registry: string
      sections: Array<RegistrySection>
    }> = []

    registries.forEach((registry) => {
      // Registry filter
      if (selectedRegistry !== 'all' && registry.name !== selectedRegistry) {
        return
      }

      const filteredRegistrySections = registry.data.items
        .map((section) => {
          const filteredItems = section.items
            .map(filterItemRecursive)
            .filter((item): item is RegistryItem => item !== null)

          if (filteredItems.length === 0) {
            return null
          }

          return {
            ...section,
            items: filteredItems,
          }
        })
        .filter((section): section is RegistrySection => section !== null)

      if (filteredRegistrySections.length > 0) {
        result.push({
          registry: registry.name,
          sections: filteredRegistrySections,
        })
      }
    })

    return result
  }, [
    registries,
    searchQuery,
    selectedRegistry,
    minStars,
    hideArchived,
    selectedLanguage,
  ])

  // Count total filtered items
  const totalFilteredItems = useMemo(() => {
    let count = 0
    filteredSections.forEach(({ sections }) => {
      sections.forEach((section) => {
        count += section.items.length
      })
    })
    return count
  }, [filteredSections])

  // Total items count
  const totalItems = useMemo(() => {
    let count = 0
    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        count += section.items.length
      })
    })
    return count
  }, [registries])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Enhansome Registry
          </h1>
          <p className="text-gray-400">
            Browse {totalItems} curated awesome lists
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Registry filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Registry
              </label>
              <select
                value={selectedRegistry}
                onChange={(e) => setSelectedRegistry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Registries</option>
                {registries.map((reg) => (
                  <option key={reg.name} value={reg.name}>
                    {reg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Min stars */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Star className="inline w-4 h-4 mr-1" />
                Min Stars: {minStars}
              </label>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={minStars}
                onChange={(e) => setMinStars(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Hide archived */}
            <div className="flex items-end lg:col-span-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideArchived}
                  onChange={(e) => setHideArchived(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-300">
                  Hide archived repositories
                </span>
              </label>
            </div>
          </div>

          {/* Results count and expand/collapse */}
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {totalFilteredItems} of {totalItems} repositories
            </p>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {expandAll ? (
                <>
                  <ChevronsUp className="w-4 h-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronsDown className="w-4 h-4" />
                  Expand All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results - Hierarchical Sections */}
        <div className="space-y-6">
          {filteredSections.map(({ registry, sections }) => (
            <div key={registry} className="space-y-6">
              {sections.map((section) => (
                <RegistrySectionComponent
                  key={`${registry}-${section.title}`}
                  title={section.title}
                  description={section.description}
                  items={section.items}
                  registry={registry}
                  initialExpanded={true}
                  expandAll={expandAll}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {totalFilteredItems === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No repositories match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
