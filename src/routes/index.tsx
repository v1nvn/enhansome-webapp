import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Calendar, Database, GitBranch, Star } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

interface RegistryMetadata {
  description: string
  name: string
  source_repository: string
  stats: {
    languages: string[]
    latest_update: null | string
    total_items: number
    total_repos: number
    total_stars: number
  }
  title: string
}

function Home() {
  const { data: registries } = useSuspenseQuery<RegistryMetadata[]>({
    queryFn: async () => {
      const response = await fetch('/api/metadata')
      if (!response.ok) {
        throw new Error('Failed to fetch registry metadata')
      }
      return await response.json()
    },
    queryKey: ['registry-metadata'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-4">
            <Database className="h-16 w-16 text-cyan-400" />
            <h1 className="text-5xl font-bold text-white md:text-6xl">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Enhansome
              </span>{' '}
              <span className="text-gray-300">Registry</span>
            </h1>
          </div>
          <p className="mb-4 text-xl font-light text-gray-300 md:text-2xl">
            Curated awesome lists with enhanced metadata
          </p>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-400">
            Browse {registries.length} carefully curated collections of the best
            tools, libraries, and resources for developers.
          </p>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-500/50 transition-colors hover:bg-cyan-600"
            to="/registry"
          >
            Browse All Repositories
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Registries Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-8 text-3xl font-bold text-white">
          Available Registries
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {registries.map(registry => (
            <Link
              className="group rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              key={registry.name}
              search={{ registry: registry.name }}
              to="/registry"
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-2xl font-semibold text-white transition-colors group-hover:text-cyan-400">
                  {registry.title}
                </h3>
                <ArrowRight className="h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-cyan-400" />
              </div>

              {registry.description && (
                <p className="mb-6 text-gray-400">{registry.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span className="text-gray-300">
                    {registry.stats.total_repos} repositories
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-gray-300">
                    {registry.stats.total_stars.toLocaleString()} stars
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4 text-purple-400" />
                  <span className="text-gray-300">
                    {registry.stats.languages.length} languages
                  </span>
                </div>

                {registry.stats.latest_update && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">
                      {new Date(
                        registry.stats.latest_update,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {registry.stats.languages.length > 0 && (
                <div className="mt-4 border-t border-slate-700 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {registry.stats.languages.slice(0, 5).map(lang => (
                      <span
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-gray-300"
                        key={lang}
                      >
                        {lang}
                      </span>
                    ))}
                    {registry.stats.languages.length > 5 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{registry.stats.languages.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
