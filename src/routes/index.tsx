import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import {
  EnhancedSearchBar,
  type EnhancedSearchBarFilters,
} from '@/components/EnhancedSearchBar'
import {
  FeaturedItems,
  LanguagePills,
  TrendingRegistries,
  UseCaseCards,
} from '@/components/home'
import {
  featuredQueryOptions,
  metadataQueryOptions,
  trendingQueryOptions,
  useCaseCategoriesQueryOptions,
} from '@/lib/server-functions'

export const Route = createFileRoute('/')({
  component: Home,

  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(metadataQueryOptions())
    void context.queryClient.ensureQueryData(trendingQueryOptions())
    void context.queryClient.ensureQueryData(featuredQueryOptions())
    // eslint-disable-next-line react-hooks/rules-of-hooks
    void context.queryClient.ensureQueryData(useCaseCategoriesQueryOptions())
  },
})

function Home() {
  const navigate = Route.useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<EnhancedSearchBarFilters>({})

  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const { data: useCaseCategories } = useSuspenseQuery(
    useCaseCategoriesQueryOptions(),
  )

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
    if (filters.preset) search.preset = filters.preset
    if (filters.registry) search.registry = filters.registry
    if (filters.sort) search.sort = filters.sort
    void navigate({ to: '/browse', search })
  }

  const handleCategoryClick = (categoryId: string) => {
    void navigate({
      to: '/browse',
      search: { category: categoryId },
    })
  }

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
              enableIntentDetection={false}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onQueryChange={setSearchQuery}
              placeholder="Search packages, categories..."
            />
          </div>
        </form>

        {/* Browse All Registries CTA */}
        <div className="mt-8 flex justify-center">
          <Link
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex rounded-xl px-8 py-3 text-lg font-semibold shadow-md transition-all"
            to="/browse"
          >
            Browse All Registries
          </Link>
        </div>
      </section>

      {/* Discovery Section */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="space-y-16">
          <UseCaseCards
            categories={useCaseCategories}
            onCategoryClick={handleCategoryClick}
          />
          <TrendingRegistries />
          <FeaturedItems />
          <LanguagePills />
        </div>
      </section>
    </div>
  )
}
