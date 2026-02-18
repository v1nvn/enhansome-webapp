import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'

import {
  CategoryExplorer,
  FeaturedSection,
  HeroSearch,
  QuickFilterPills,
  TrendingSection,
} from '@/components/home'
import {
  categorySummariesQueryOptions,
  featuredQueryOptions,
  metadataQueryOptions,
  trendingQueryOptions,
} from '@/lib/server-functions'

export const Route = createFileRoute('/')({
  component: Home,
  loader: ({ context }) => {
    // Preload all the data we need
    void context.queryClient.ensureQueryData(metadataQueryOptions())
    void context.queryClient.ensureQueryData(featuredQueryOptions())
    void context.queryClient.ensureQueryData(trendingQueryOptions())
    void context.queryClient.ensureQueryData(categorySummariesQueryOptions())
  },
})

function Home() {
  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const { data: featured } = useSuspenseQuery(featuredQueryOptions())
  const { data: trending } = useSuspenseQuery(trendingQueryOptions())
  const { data: categories } = useSuspenseQuery(categorySummariesQueryOptions())

  // Get unique languages from all registries
  const allLanguages = registries.flatMap(r => r.stats.languages)
  const uniqueLanguages = Array.from(new Set(allLanguages)).sort()

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section - Dramatic Editorial Style */}
      <section className="border-border/50 relative overflow-hidden border-b">
        {/* Animated decorative background */}
        <div className="absolute inset-0">
          {/* Large gradient orbs */}
          <div
            className="bg-primary/10 absolute -right-48 top-0 h-[600px] w-[600px] -translate-y-1/3 animate-pulse rounded-full blur-[120px]"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="bg-accent/10 absolute -left-32 bottom-0 h-[500px] w-[500px] translate-y-1/3 animate-pulse rounded-full blur-[100px]"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
          <div className="from-primary/5 to-accent/5 absolute inset-0 bg-gradient-to-br via-transparent" />

          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Animated Badge */}
            <div className="border-border/60 bg-card/80 text-foreground animate-in fade-in slide-in-from-bottom-4 mb-10 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-sm duration-700">
              <span className="relative flex h-2.5 w-2.5">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex h-2.5 w-2.5 rounded-full" />
              </span>
              <span>{registries.length} Curated Collections</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground/60">Updated weekly</span>
            </div>

            {/* Main Headline with gradient text */}
            <h1 className="font-display text-foreground animate-in fade-in slide-in-from-bottom-8 mb-6 text-5xl font-bold leading-[1.05] tracking-tight delay-100 duration-700 md:text-6xl lg:text-7xl xl:text-8xl">
              Discover
              <span className="mt-2 block">
                <span className="relative inline-block">
                  Exceptional
                  <span
                    className="from-primary via-accent to-primary animate-gradient-x absolute inset-0 bg-gradient-to-r bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 100%' }}
                  />
                </span>
              </span>
              <span className="from-foreground via-muted-foreground to-foreground mt-2 block bg-gradient-to-r bg-clip-text text-transparent">
                Developer Tools
              </span>
            </h1>

            {/* Enhanced Subtitle */}
            <p className="font-body text-muted-foreground/90 animate-in fade-in slide-in-from-bottom-6 mx-auto mb-12 max-w-2xl text-lg leading-relaxed delay-200 duration-700 md:text-xl">
              Explore carefully curated awesome lists with rich metadata.
              <span className="text-foreground">
                {' '}
                Find the best libraries, frameworks,
              </span>{' '}
              and resources for your next project.
            </p>

            {/* Hero Search */}
            <div className="animate-in fade-in slide-in-from-bottom-4 mb-10 delay-300 duration-700">
              <HeroSearch />
            </div>

            {/* Secondary CTAs */}
            <div className="animate-in fade-in slide-in-from-bottom-2 delay-400 flex flex-col items-center gap-4 duration-700 sm:flex-row sm:justify-center">
              <Link
                className="group/cta bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/30 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                to="/registries"
              >
                <span>Browse all registries</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
              </Link>
              <Link
                className="group/cta border-border/60 bg-card/80 text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                to="/registry"
              >
                <Sparkles className="text-primary h-4 w-4" />
                <span>Explore featured</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="from-background absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t to-transparent" />
      </section>

      {/* Featured Section */}
      {featured.length > 0 && <FeaturedSection featured={featured} />}

      {/* Trending Section */}
      {trending.length > 0 && <TrendingSection trending={trending} />}

      {/* Quick Filter Pills */}
      <QuickFilterPills languages={uniqueLanguages} />

      {/* Category Explorer */}
      <CategoryExplorer categories={categories} />

      {/* Footer CTA Section */}
      <section className="border-border/50 bg-muted/20 border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-foreground text-2xl font-bold md:text-3xl">
            Can't find what you're looking for?
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm">
            Our collection is constantly growing. Check back regularly for new
            additions.
          </p>
        </div>
      </section>
    </div>
  )
}
