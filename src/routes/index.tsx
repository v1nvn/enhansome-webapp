import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Database,
  Star,
  GitBranch,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import type { RegistryFile } from '@/types/registry'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { data: registries } = useSuspenseQuery<RegistryFile[]>({
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

  // Calculate stats for each registry
  const registryStats = registries.map((registry) => {
    let totalRepos = 0
    let totalStars = 0
    let languages = new Set<string>()
    let latestUpdate = ''

    registry.data.items.forEach((section) => {
      section.items.forEach((item) => {
        if (item.repo_info) {
          totalRepos++
          totalStars += item.repo_info.stars
          if (item.repo_info.language) {
            languages.add(item.repo_info.language)
          }
          if (
            !latestUpdate ||
            new Date(item.repo_info.last_commit) > new Date(latestUpdate)
          ) {
            latestUpdate = item.repo_info.last_commit
          }
        }
      })
    })

    return {
      name: registry.name,
      title: registry.data.metadata.title,
      description: registry.data.metadata.source_repository_description,
      totalRepos,
      totalStars,
      languages: Array.from(languages),
      latestUpdate,
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Database className="w-16 h-16 text-cyan-400" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Enhansome
              </span>{' '}
              <span className="text-gray-300">Registry</span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
            Curated awesome lists with enhanced metadata
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Browse {registries.length} carefully curated collections of the best
            tools, libraries, and resources for developers.
          </p>
          <Link
            to="/registry"
            className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
          >
            Browse All Repositories
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Registries Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-8">
          Available Registries
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registryStats.map((registry) => (
            <Link
              key={registry.name}
              to="/registry"
              search={{ registry: registry.name }}
              className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {registry.title}
                </h3>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>

              {registry.description && (
                <p className="text-gray-400 mb-6">{registry.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">
                    {registry.totalRepos} repositories
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">
                    {registry.totalStars.toLocaleString()} stars
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">
                    {registry.languages.length} languages
                  </span>
                </div>

                {registry.latestUpdate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">
                      {new Date(registry.latestUpdate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {registry.languages.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    {registry.languages.slice(0, 5).map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 text-xs bg-slate-700 text-gray-300 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                    {registry.languages.length > 5 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{registry.languages.length - 5} more
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
