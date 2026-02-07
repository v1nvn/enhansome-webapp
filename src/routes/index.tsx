import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Calendar, Database, GitBranch, Star } from 'lucide-react'

import { metadataQueryOptions } from '@/lib/server-functions'

export const Route = createFileRoute('/')({
  component: Home,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(metadataQueryOptions()),
})

function Home() {
  const { data: registries } = useSuspenseQuery(metadataQueryOptions())

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section - Editorial Style */}
      <section className="border-border relative overflow-hidden border-b">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="bg-accent absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/4 rounded-full blur-3xl" />
          <div className="bg-primary/20 absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="border-border bg-card text-muted-foreground mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm">
              <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
              <span>{registries.length} Curated Collections</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-foreground mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl">
              Discover Exceptional
              <span className="from-primary via-primary to-accent mt-2 block bg-gradient-to-r bg-clip-text text-transparent">
                Developer Tools
              </span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed md:text-xl">
              Browse carefully curated awesome lists with enhanced metadata.
              Find the best libraries, frameworks, and resources for your next
              project.
            </p>

            {/* CTA Button */}
            <Link
              className="bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/30 group inline-flex items-center gap-3 rounded-lg px-8 py-4 font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              to="/registry"
            >
              <span>Explore Registries</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Registries Grid - Editorial Card Layout */}
      <section className="border-border bg-muted/30 border-b">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          {/* Section Header */}
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="text-primary mb-2 text-sm font-semibold uppercase tracking-widest">
                Browse Collections
              </p>
              <h2 className="font-display text-foreground text-3xl font-bold md:text-4xl">
                Available Registries
              </h2>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-muted-foreground text-sm">
                {registries
                  .reduce((sum, r) => sum + r.stats.totalRepos, 0)
                  .toLocaleString()}{' '}
                total repositories
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {registries.map((registry, index) => (
              <Link
                className="border-border bg-card group relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                key={registry.name}
                search={{ registry: registry.name }}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                to="/registry"
              >
                {/* Decorative corner accent */}
                <div className="bg-primary/5 group-hover:bg-primary/10 absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full transition-colors" />

                <div className="relative">
                  {/* Card Header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-display text-foreground group-hover:text-primary text-2xl font-bold transition-colors">
                        {registry.title}
                      </h3>
                      {registry.description && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                          {registry.description}
                        </p>
                      )}
                    </div>
                    <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors">
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
                      <Database className="text-primary h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-foreground text-lg font-bold">
                          {registry.stats.totalRepos.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Repos
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="text-foreground text-lg font-bold">
                          {registry.stats.totalStars.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Stars
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
                      <GitBranch className="text-chart-3 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-foreground text-lg font-bold">
                          {registry.stats.languages.length}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Languages
                        </span>
                      </div>
                    </div>

                    {registry.stats.latestUpdate && (
                      <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
                        <Calendar className="text-chart-4 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="text-foreground text-xs font-bold">
                            {new Date(
                              registry.stats.latestUpdate,
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Updated
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Languages Tags */}
                  {registry.stats.languages.length > 0 && (
                    <div className="border-border mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {registry.stats.languages.slice(0, 4).map(lang => (
                        <span
                          className="bg-accent/30 text-foreground rounded-full px-3 py-1 text-xs font-medium"
                          key={lang}
                        >
                          {lang}
                        </span>
                      ))}
                      {registry.stats.languages.length > 4 && (
                        <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                          +{registry.stats.languages.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
