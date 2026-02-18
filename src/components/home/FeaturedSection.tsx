import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Award, Sparkles, TrendingUp } from 'lucide-react'

import type { FeaturedRegistry } from '@/lib/server-functions'

interface FeaturedSectionProps {
  featured: FeaturedRegistry[]
}

const badgeConfig = {
  'editors-choice': {
    icon: Award,
    label: "Editor's Choice",
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  trending: {
    icon: TrendingUp,
    label: 'Trending',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  new: {
    icon: Sparkles,
    label: 'New',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  },
} as const

interface FeaturedCardProps {
  index: number
  item: FeaturedRegistry
  size: 'large' | 'small'
}

export function FeaturedSection({ featured }: FeaturedSectionProps) {
  if (featured.length === 0) {
    return null
  }

  // First 2 items are large, rest are small
  const largeItems = featured.slice(0, 2)
  const smallItems = featured.slice(2, 8)

  return (
    <section className="border-border/50 from-card to-muted/20 relative overflow-hidden border-b bg-gradient-to-b">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        {/* Section Header with editorial styling */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-primary/30 h-px flex-1" />
            <span className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">
              Curated Selection
            </span>
            <div className="bg-primary/30 h-px flex-1" />
          </div>
          <h2 className="font-display text-foreground text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Hand-Picked Gems
          </h2>
          <p className="text-muted-foreground/80 mt-4 max-w-xl text-lg leading-relaxed">
            Exceptional collections curated by our editors for outstanding
            quality, usefulness, and community impact.
          </p>
        </div>

        {/* Editorial asymmetrical grid with offset */}
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] lg:gap-8">
          {/* Large Cards */}
          {largeItems.map((item, idx) => (
            <FeaturedCard
              index={idx}
              item={item}
              key={item.name}
              size="large"
            />
          ))}

          {/* Small Cards */}
          {smallItems.map((item, idx) => (
            <FeaturedCard
              index={idx + 2}
              item={item}
              key={item.name}
              size="small"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedCard({ item, index, size }: FeaturedCardProps) {
  const badge = item.editorial_badge
    ? badgeConfig[item.editorial_badge as keyof typeof badgeConfig]
    : null

  const BadgeIcon = badge?.icon ?? Award

  // Stagger animation based on index
  const animationDelay = `${index * 75}ms`

  return (
    <Link
      className="group/card border-border/60 bg-card/80 hover:shadow-primary/5 relative overflow-hidden rounded-3xl border shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      params={{ name: item.name }}
      style={{
        animation: 'fadeInUp 0.6s ease-out forwards',
        animationDelay,
        opacity: 0,
      }}
      to="/registry/$name"
    >
      {/* Animated gradient overlay on hover */}
      <div className="from-primary/0 via-primary/5 to-primary/0 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />

      {/* Decorative corner element */}
      <div className="bg-primary/5 absolute -right-8 -top-8 h-24 w-24 rounded-full transition-transform duration-500 group-hover/card:scale-150" />

      {/* Badge with enhanced styling */}
      {badge && (
        <div
          className={`absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${badge.className}`}
        >
          <BadgeIcon className="h-3 w-3" />
          <span>{badge.label}</span>
        </div>
      )}

      <div className="relative p-8">
        {/* Content */}
        <div className={size === 'large' ? 'space-y-5' : 'space-y-4'}>
          {/* Title with underline effect */}
          <div>
            <h3
              className={`font-display text-foreground font-bold leading-tight transition-colors duration-300 ${size === 'large' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}
            >
              <span className="relative inline-block">
                {item.title}
                <span className="bg-primary/60 absolute -bottom-1 left-0 h-0.5 w-0 transition-all duration-300 group-hover/card:w-full" />
              </span>
            </h3>
            {item.description && (
              <p
                className={`text-muted-foreground/80 mt-3 leading-relaxed ${size === 'large' ? 'line-clamp-3 text-base' : 'line-clamp-2 text-sm'}`}
              >
                {item.description}
              </p>
            )}
          </div>

          {/* Enhanced stats row */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <span className="text-foreground font-semibold tabular-nums">
                {item.total_items.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60 text-xs uppercase tracking-wide">
                Repos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <span className="text-foreground font-semibold tabular-nums">
                {item.total_stars.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60 text-xs uppercase tracking-wide">
                Stars
              </span>
            </div>
          </div>
        </div>

        {/* Explore link on hover */}
        <div className="text-primary mt-6 flex -translate-x-2 items-center gap-2 text-sm font-semibold opacity-0 transition-all duration-300 group-hover/card:translate-x-0 group-hover/card:opacity-100">
          <span>Explore collection</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )
}
