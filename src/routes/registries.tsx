import { useState } from 'react'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import { RegistriesBrowser } from '@/components/RegistriesBrowser'
import { metadataQueryOptions } from '@/lib/server-functions'

export const Route = createFileRoute('/registries')({
  component: RegistriesPage,
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(metadataQueryOptions())
  },
})

function RegistriesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <section className="border-border border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          {/* Breadcrumb */}
          <button
            className="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2 text-sm transition-colors"
            onClick={() => {
              void navigate({ to: '/' })
            }}
            type="button"
          >
            <span>Back to Home</span>
          </button>

          {/* Title */}
          <h1 className="font-display text-foreground mb-4 text-4xl font-bold md:text-5xl">
            All Registries
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse all curated collections, organized by ecosystem
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                className="border-border bg-card focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-3 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2"
                onChange={e => {
                  setSearchQuery(e.target.value)
                }}
                placeholder="Search registries..."
                type="text"
                value={searchQuery}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Registry Browser */}
      <section className="border-border bg-muted/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <RegistriesBrowser searchQuery={searchQuery} />
        </div>
      </section>
    </div>
  )
}
