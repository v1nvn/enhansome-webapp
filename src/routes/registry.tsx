import { useMemo } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { FilterValues } from '@/components/FiltersSidebar'

import { FiltersSidebar } from '@/components/FiltersSidebar'
import { RegistryLayout } from '@/components/RegistryLayout'
import type { SearchTag } from '@/components/SearchBar'
import {
  categoriesQueryOptions,
  languagesQueryOptions,
  metadataQueryOptions,
} from '@/lib/server-functions'

interface RegistrySearch {
  archived?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  lang?: string
  q?: string
  registry?: string
  sort?: 'name' | 'stars' | 'updated'
  starsMax?: string
  starsMin?: string
}

export const Route = createFileRoute('/registry')({
  component: RegistryBrowser,
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    archived: search.archived as string | undefined,
    category: search.category as string | undefined,
    dateFrom: search.dateFrom as string | undefined,
    dateTo: search.dateTo as string | undefined,
    lang: search.lang as string | undefined,
    q: search.q as string | undefined,
    registry: search.registry as string | undefined,
    sort: (search.sort as 'name' | 'stars' | 'updated' | undefined) || 'stars',
    starsMax: search.starsMax as string | undefined,
    starsMin: search.starsMin as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    registry: search.registry,
  }),
  loader: async ({ context, deps }) => {
    // Preload metadata, registry-specific languages, and registry-specific categories
    // This ensures all data is ready before component renders (SWR pattern)
    await Promise.all([
      context.queryClient.ensureQueryData(metadataQueryOptions()),
      context.queryClient.ensureQueryData(languagesQueryOptions(deps.registry)),
      context.queryClient.ensureQueryData(
        categoriesQueryOptions(deps.registry),
      ),
    ])
  },
  pendingComponent: () => (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Main Content Skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-72 bg-white p-6">
          <div className="space-y-6">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* Header Skeleton */}
          <div className="bg-white px-6 py-3 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="flex-1 overflow-hidden bg-white p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  className="h-48 animate-pulse rounded-2xl bg-slate-100 shadow-md"
                  key={`skeleton-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [{ title: 'Enhansome Registry Browser' }],
  }),
})

function RegistryBrowser() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // Fetch registry metadata for registry names
  const { data: registryMetadata } = useSuspenseQuery(metadataQueryOptions())

  // Fetch registry-specific languages from API
  const { data: languages } = useSuspenseQuery(
    languagesQueryOptions(search.registry),
  )

  const registryNames = useMemo(() => {
    return registryMetadata.map(r => r.name)
  }, [registryMetadata])

  // Convert URL params to SearchTags for search bar
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
    return tags
  }, [search])

  // Filters for the sidebar
  const currentFilters = useMemo((): FilterValues => {
    return {
      archived: search.archived,
      category: search.category,
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      registry: search.registry,
      sort: search.sort,
      starsMax: search.starsMax,
      starsMin: search.starsMin,
    }
  }, [search])

  // Update URL when tags change from search bar
  const handleTagsChange = (tags: SearchTag[]) => {
    const newSearch: RegistrySearch = { ...search }

    // Clear search-bar-specific filters
    delete newSearch.q
    delete newSearch.lang

    // Apply new tags
    tags.forEach(tag => {
      switch (tag.type) {
        case 'language':
          newSearch.lang = tag.value
          break
        case 'text':
          newSearch.q = tag.value
          break
      }
    })

    void navigate({ search: newSearch })
  }

  // Update URL when filters change from sidebar
  const handleFiltersChange = (filters: FilterValues) => {
    const newSearch: RegistrySearch = {
      ...search,
      archived: filters.archived,
      category: filters.category,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      registry: filters.registry,
      sort: filters.sort || search.sort,
      starsMax: filters.starsMax,
      starsMin: filters.starsMin,
    }

    void navigate({ search: newSearch })
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Main Content - Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar */}
        <FiltersSidebar
          onFiltersChange={handleFiltersChange}
          registryNames={registryNames}
          selectedFilters={currentFilters}
          selectedRegistry={search.registry}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <RegistryLayout
            dateFrom={search.dateFrom}
            dateTo={search.dateTo}
            hideArchived={search.archived === 'false'}
            languages={languages}
            maxStars={search.starsMax ? parseInt(search.starsMax) : undefined}
            minStars={search.starsMin ? parseInt(search.starsMin) : undefined}
            onTagsChange={handleTagsChange}
            registries={registryNames}
            searchQuery={search.q}
            searchTags={searchTags}
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
