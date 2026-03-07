import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import {
  CategoryBrowser,
  RegistryExplorer,
  TrendingTags,
} from '@/components/home'
import {
  filterOptionsQueryOptions,
  metadataQueryOptions,
  trendingQueryOptions,
  trendingTagsQueryOptions,
} from '@/lib/api/server-functions'

export const Route = createFileRoute('/')({
  component: Home,

  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(metadataQueryOptions())
    void context.queryClient.ensureQueryData(filterOptionsQueryOptions())
    void context.queryClient.ensureQueryData(trendingQueryOptions())
    void context.queryClient.ensureQueryData(trendingTagsQueryOptions())
  },
})

function Home() {
  const navigate = Route.useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const { data: filterOptions } = useSuspenseQuery(filterOptionsQueryOptions())
  const { data: trendingRegistries } = useSuspenseQuery(trendingQueryOptions())
  const { data: trendingTags } = useSuspenseQuery(trendingTagsQueryOptions())

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      void navigate({ search: { q: searchQuery.trim() }, to: '/browse' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Discover Awesome Tools
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Search {registries.length} curated registries for the best libraries,
          frameworks, and resources
        </p>

        <form className="mt-10 flex justify-center" onSubmit={handleSearch}>
          <div className="relative w-full max-w-2xl">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-14 w-full rounded-xl border border-border bg-card pr-4 pl-12 text-lg shadow-md transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              onChange={e => {
                setSearchQuery(e.target.value)
              }}
              placeholder="Search packages, frameworks, categories..."
              type="text"
              value={searchQuery}
            />
          </div>
        </form>
      </section>

      {/* Discovery Section */}
      <section className="mx-auto max-w-5xl space-y-12 px-4 pb-20 sm:px-6 lg:px-8">
        <RegistryExplorer registries={trendingRegistries} />
        <CategoryBrowser categories={filterOptions.categories} limit={20} />
        <TrendingTags limit={20} tags={trendingTags} />
      </section>
    </div>
  )
}
