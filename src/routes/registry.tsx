import { useMemo } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { RegistryFile } from '@/types/registry'

import { RegistryLayout } from '@/components/RegistryLayout'
import { RegistrySidebar } from '@/components/RegistrySidebar'
import { SearchBar, type SearchTag } from '@/components/SearchBar'

interface RegistrySearch {
  archived?: string
  category?: string
  lang?: string
  q?: string
  registry?: string
  sort?: 'name' | 'stars' | 'updated'
  stars?: string
}

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    q: search.q as string | undefined,
    lang: search.lang as string | undefined,
    stars: search.stars as string | undefined,
    archived: search.archived as string | undefined,
    registry: search.registry as string | undefined,
    category: search.category as string | undefined,
    sort: (search.sort as 'stars' | 'updated' | 'name' | undefined) || 'stars',
  }),
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
})

function RegistryBrowser() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const { data: registries } = useSuspenseQuery<RegistryFile[]>({
    queryFn: async () => {
      const response = await fetch('/api/registry')
      if (!response.ok) {
        throw new Error('Failed to fetch registry data')
      }
      return response.json()
    },
    queryKey: ['registry'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  // Get unique languages and registry names
  const languages = useMemo(() => {
    const langs = new Set<string>()
    registries.forEach(registry => {
      registry.data.items.forEach(section => {
        section.items.forEach(item => {
          if (item.repo_info?.language) {
            langs.add(item.repo_info.language)
          }
        })
      })
    })
    return Array.from(langs).sort()
  }, [registries])

  const registryNames = useMemo(() => {
    return registries.map(r => r.name)
  }, [registries])

  // Convert URL params to SearchTags
  const searchTags = useMemo((): SearchTag[] => {
    const tags: SearchTag[] = []
    if (search.q) {
      tags.push({ label: search.q, type: 'text', value: search.q })
    }
    if (search.lang) {
      tags.push({
        label: `language:${search.lang}`,
        type: 'language',
        value: search.lang,
      })
    }
    if (search.stars) {
      tags.push({
        label: `stars:${search.stars}`,
        type: 'stars',
        value: search.stars,
      })
    }
    if (search.archived) {
      tags.push({
        label: `is:${search.archived === 'true' ? 'archived' : 'active'}`,
        type: 'archived',
        value: search.archived,
      })
    }
    if (search.registry) {
      tags.push({
        label: `registry:${search.registry}`,
        type: 'registry',
        value: search.registry,
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
    tags.forEach(tag => {
      if (tag.type === 'text') newSearch.q = tag.value
      else if (tag.type === 'language') newSearch.lang = tag.value
      else if (tag.type === 'stars') newSearch.stars = tag.value
      else if (tag.type === 'archived') newSearch.archived = tag.value
      else if (tag.type === 'registry') newSearch.registry = tag.value
    })

    navigate({ search: newSearch })
  }

  const handleRegistrySelect = (registry: null | string) => {
    navigate({
      search: {
        ...search,
        category: undefined,
        registry: registry || undefined,
      },
    })
  }

  const handleCategorySelect = (category: string) => {
    navigate({ search: { ...search, category } })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-md">
        <div className="px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Enhansome Registry
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Browse curated awesome lists
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                onChange={e => {
                  navigate({
                    search: {
                      ...search,
                      sort: e.target.value as 'name' | 'stars' | 'updated',
                    },
                  }).catch((err: unknown) => {
                    console.log(err)
                  })
                }}
                value={search.sort || 'stars'}
              >
                <option value="stars">Most Stars</option>
                <option value="updated">Recently Updated</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            languages={languages}
            onTagsChange={handleTagsChange}
            registries={registryNames}
            tags={searchTags}
          />
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <RegistrySidebar
            onCategorySelect={handleCategorySelect}
            onRegistrySelect={handleRegistrySelect}
            registries={registries}
            selectedCategory={search.category || null}
            selectedRegistry={search.registry || null}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <RegistryLayout
            hideArchived={search.archived === 'true'}
            minStars={
              search.stars?.startsWith('>')
                ? parseInt(search.stars.slice(1))
                : undefined
            }
            registries={registries}
            searchQuery={search.q}
            selectedCategory={search.category}
            selectedLanguage={search.lang}
            selectedRegistry={search.registry}
            sortBy={search.sort || 'stars'}
          />
        </div>
      </div>
    </div>
  )
}
