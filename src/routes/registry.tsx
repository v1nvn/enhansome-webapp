import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { RegistryFile } from '@/types/registry'
import { RegistryLayout } from '@/components/RegistryLayout'
import { SearchBar, type SearchTag } from '@/components/SearchBar'
import { RegistrySidebar } from '@/components/RegistrySidebar'

interface RegistrySearch {
  q?: string
  lang?: string
  stars?: string
  archived?: string
  registry?: string
  category?: string
  sort?: 'stars' | 'updated' | 'name'
}

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    q: search.q as string | undefined,
    lang: search.lang as string | undefined,
    stars: search.stars as string | undefined,
    archived: search.archived as string | undefined,
    registry: search.registry as string | undefined,
    category: search.category as string | undefined,
    sort: (search.sort as 'stars' | 'updated' | 'name' | undefined) || 'stars',
  }),
})

function RegistryBrowser() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

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

  // Get unique languages and registry names
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

  const registryNames = useMemo(() => {
    return registries.map((r) => r.name)
  }, [registries])

  // Convert URL params to SearchTags
  const searchTags = useMemo((): SearchTag[] => {
    const tags: SearchTag[] = []
    if (search.q) {
      tags.push({ type: 'text', value: search.q, label: search.q })
    }
    if (search.lang) {
      tags.push({
        type: 'language',
        value: search.lang,
        label: `language:${search.lang}`,
      })
    }
    if (search.stars) {
      tags.push({ type: 'stars', value: search.stars, label: `stars:${search.stars}` })
    }
    if (search.archived) {
      tags.push({
        type: 'archived',
        value: search.archived,
        label: `is:${search.archived === 'true' ? 'archived' : 'active'}`,
      })
    }
    if (search.registry) {
      tags.push({
        type: 'registry',
        value: search.registry,
        label: `registry:${search.registry}`,
      })
    }
    return tags
  }, [search])

  // Update URL when tags change
  const handleTagsChange = (tags: SearchTag[]) => {
    const newSearch: RegistrySearch = { ...search }

    // Clear existing filters
    delete newSearch.q
    delete newSearch.lang
    delete newSearch.stars
    delete newSearch.archived
    delete newSearch.registry

    // Apply new tags
    tags.forEach((tag) => {
      if (tag.type === 'text') newSearch.q = tag.value
      else if (tag.type === 'language') newSearch.lang = tag.value
      else if (tag.type === 'stars') newSearch.stars = tag.value
      else if (tag.type === 'archived') newSearch.archived = tag.value
      else if (tag.type === 'registry') newSearch.registry = tag.value
    })

    navigate({ search: newSearch })
  }

  const handleRegistrySelect = (registry: string | null) => {
    navigate({
      search: { ...search, registry: registry || undefined, category: undefined },
    })
  }

  const handleCategorySelect = (category: string) => {
    navigate({ search: { ...search, category } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-md">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Enhansome Registry
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Browse curated awesome lists
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={search.sort || 'stars'}
                onChange={(e) =>
                  navigate({
                    search: {
                      ...search,
                      sort: e.target.value as 'stars' | 'updated' | 'name',
                    },
                  })
                }
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="stars">Most Stars</option>
                <option value="updated">Recently Updated</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            tags={searchTags}
            onTagsChange={handleTagsChange}
            languages={languages}
            registries={registryNames}
          />
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <RegistrySidebar
            registries={registries}
            selectedRegistry={search.registry || null}
            selectedCategory={search.category || null}
            onRegistrySelect={handleRegistrySelect}
            onCategorySelect={handleCategorySelect}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <RegistryLayout
            registries={registries}
            sortBy={search.sort || 'stars'}
            selectedLanguage={search.lang}
            searchQuery={search.q}
            minStars={
              search.stars?.startsWith('>')
                ? parseInt(search.stars.slice(1))
                : undefined
            }
            hideArchived={search.archived === 'true'}
            selectedRegistry={search.registry}
            selectedCategory={search.category}
          />
        </div>
      </div>
    </div>
  )
}
