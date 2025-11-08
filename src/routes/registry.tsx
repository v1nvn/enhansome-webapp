import { useMemo } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RegistryLayout } from '@/components/RegistryLayout'
import { RegistrySidebar } from '@/components/RegistrySidebar'
import { SearchBar, type SearchTag } from '@/components/SearchBar'
import {
  languagesQueryOptions,
  metadataQueryOptions,
} from '@/lib/server-functions'

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
    archived: search.archived as string | undefined,
    category: search.category as string | undefined,
    lang: search.lang as string | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort: (search.sort as 'name' | 'stars' | 'updated' | undefined) || 'stars',
    stars: search.stars as string | undefined,
  }),
  loader: ({ context }) => {
    // Preload metadata and languages
    void context.queryClient.ensureQueryData(metadataQueryOptions())
    void context.queryClient.ensureQueryData(languagesQueryOptions())
  },
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
})

function RegistryBrowser() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // Fetch registry metadata for registry names
  const { data: registryMetadata } = useSuspenseQuery(metadataQueryOptions())

  // Fetch languages from API
  const { data: languages = [] } = useSuspenseQuery(languagesQueryOptions())

  const registryNames = useMemo(() => {
    return registryMetadata.map(r => r.name)
  }, [registryMetadata])

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
      switch (tag.type) {
        case 'archived':
          newSearch.archived = tag.value
          break
        case 'language':
          newSearch.lang = tag.value
          break
        case 'registry':
          newSearch.registry = tag.value
          break
        case 'stars':
          newSearch.stars = tag.value
          break
        case 'text':
          newSearch.q = tag.value
          break
      }
    })

    void navigate({ search: newSearch })
  }

  const handleRegistrySelect = (registry: null | string) => {
    void navigate({
      search: {
        ...search,
        category: undefined,
        registry: registry || undefined,
      },
    })
  }

  const handleCategorySelect = (category: string) => {
    void navigate({ search: { ...search, category } })
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
            registryNames={registryNames}
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
