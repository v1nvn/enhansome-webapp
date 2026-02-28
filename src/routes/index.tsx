import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  EnhancedSearchBar,
  type EnhancedSearchBarFilters,
} from '@/components/EnhancedSearchBar'
import { FrameworkPills, UseCaseCards } from '@/components/home'
import {
  filterOptionsQueryOptions,
  metadataQueryOptions,
} from '@/lib/api/server-functions'

export const Route = createFileRoute('/')({
  component: Home,

  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(metadataQueryOptions())
    void context.queryClient.ensureQueryData(filterOptionsQueryOptions())
  },
})

function Home() {
  const navigate = Route.useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<EnhancedSearchBarFilters>({})

  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const { data: filterOptions } = useSuspenseQuery(filterOptionsQueryOptions())

  const handleFiltersChange = (newFilters: EnhancedSearchBarFilters) => {
    setFilters(newFilters)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigate to /browse with current filters and query
    const search: Record<string, string | undefined> = {}
    if (searchQuery.trim()) search.q = searchQuery.trim()
    if (filters.category) search.category = filters.category
    if (filters.lang) search.lang = filters.lang
    if (filters.registry) search.registry = filters.registry
    if (filters.sort) search.sort = filters.sort
    void navigate({ to: '/browse', search })
  }

  const handleCategoryClick = (categoryName: string) => {
    void navigate({
      to: '/browse',
      search: { cat: categoryName },
    })
  }

  const topCategories = filterOptions.categories.slice(0, 15)

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-foreground text-5xl font-bold tracking-tight md:text-6xl">
          Discover Developer Tools
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
          Search {registries.length} curated registries for the best libraries,
          frameworks, and resources
        </p>

        <form className="mt-10 flex justify-center" onSubmit={handleSearch}>
          <div className="w-full max-w-2xl">
            <EnhancedSearchBar
              enableIntentDetection={true}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onQueryChange={setSearchQuery}
              placeholder="Search packages, frameworks, categories..."
            />
          </div>
        </form>
      </section>

      {/* Discovery Section */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <UseCaseCards
            categories={topCategories}
            onCategoryClick={handleCategoryClick}
          />
          <FrameworkPills />
        </div>
      </section>
    </div>
  )
}
