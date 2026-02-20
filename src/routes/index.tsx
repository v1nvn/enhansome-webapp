import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

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
  const [filters, setFilters] = useState<EnhancedSearchBarFilters>({})

  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const { data: useCaseCategories } = useSuspenseQuery(
    useCaseCategoriesQueryOptions(),
  )

  const handleFiltersChange = (newFilters: EnhancedSearchBarFilters) => {
    setFilters(newFilters)
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-foreground text-4xl font-bold tracking-tight md:text-5xl">
          Discover Developer Tools
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
          Search {registries.length} curated registries for the best libraries,
          frameworks, and resources
        </p>

        <div className="mt-8 flex justify-center">
          <EnhancedSearchBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            placeholder="Search packages, categories..."
          />
        </div>
      </section>

      {/* Discovery Section */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <UseCaseCards categories={useCaseCategories} />
          <TrendingRegistries />
          <FeaturedItems />
          <LanguagePills />
        </div>
      </section>
    </div>
  )
}
