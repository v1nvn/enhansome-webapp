import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  Archive,
  Calendar,
  ExternalLink,
  Filter,
  GitBranch,
  Search,
  Star,
} from 'lucide-react'
import type { RegistryFile, RegistryItem } from '@/types/registry'

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

  // Flatten all items from all registries
  const allItems = useMemo(() => {
    const items: Array<{
      item: RegistryItem
      registry: string
      section: string
    }> = []

    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        section.items.forEach((item) => {
          if (item.repo_info) {
            items.push({
              item,
              registry: registry.name,
              section: section.title,
            })
          }
        })
      })
    })

    return items
  }, [registries])

  // Get unique languages
  const languages = useMemo(() => {
    const langs = new Set<string>()
    allItems.forEach(({ item }) => {
      if (item.repo_info?.language) {
        langs.add(item.repo_info.language)
      }
    })
    return Array.from(langs).sort()
  }, [allItems])

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter(({ item, registry }) => {
      // Registry filter
      if (selectedRegistry !== 'all' && registry !== selectedRegistry) {
        return false
      }

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
    })
  }, [
    allItems,
    searchQuery,
    selectedRegistry,
    minStars,
    hideArchived,
    selectedLanguage,
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Enhansome Registry
          </h1>
          <p className="text-gray-400">
            Browse {allItems.length} curated awesome lists
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

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-gray-400">
              Showing {filteredItems.length} of {allItems.length} repositories
            </p>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(({ item, registry, section }, index) => (
            <div
              key={`${registry}-${section}-${index}`}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-cyan-400">{registry}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">{section}</span>
                  </div>
                </div>
                {item.repo_info?.archived && (
                  <Archive className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Repo Info */}
              {item.repo_info && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3" />
                        {item.repo_info.stars.toLocaleString()}
                      </span>
                      {item.repo_info.language && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <GitBranch className="w-3 h-3" />
                          {item.repo_info.language}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.repo_info.last_commit).toLocaleDateString()}
                    </span>
                    <a
                      href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No repositories match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
