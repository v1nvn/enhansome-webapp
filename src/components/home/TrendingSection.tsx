import { Link } from '@tanstack/react-router'
import { ArrowRight, Flame, TrendingUp } from 'lucide-react'

import type { TrendingRegistry } from '@/lib/server-functions'

interface TrendingCardProps {
  index: number
  item: TrendingRegistry
}

interface TrendingSectionProps {
  trending: TrendingRegistry[]
}

export function TrendingSection({ trending }: TrendingSectionProps) {
  if (trending.length === 0) {
    return null
  }

  return (
    <section className="border-border/50 bg-card/50 border-b backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Flame className="text-primary h-5 w-5" />
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em]">
                Hot Right Now
              </span>
            </div>
            <h2 className="font-display text-foreground text-3xl font-bold md:text-4xl">
              Trending Collections
            </h2>
          </div>
          <Link
            className="text-muted-foreground hover:text-primary group flex items-center gap-2 text-sm font-medium transition-colors"
            to="/registries"
          >
            <span>View all</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative">
          {/* Fade indicators for scroll */}
          <div className="from-card/80 pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent" />
          <div className="from-card/80 pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l to-transparent" />

          {/* Scrollable cards */}
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((item, idx) => (
              <TrendingCard index={idx} item={item} key={item.name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrendingCard({ item, index }: TrendingCardProps) {
  const growthPercent =
    item.starsGrowth > 0 ? `+${item.starsGrowth}%` : `${item.starsGrowth}%`

  const isPositiveGrowth = item.starsGrowth > 0

  // Rank styling
  const rankColors = [
    'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
    'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
    'bg-gradient-to-br from-amber-600 to-amber-800 text-white',
  ]
  const rankColor = rankColors[index] ?? 'bg-muted text-muted-foreground'

  return (
    <Link
      className="group/trending border-border/60 bg-card hover:shadow-primary/5 relative flex w-[280px] shrink-0 snap-start flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:w-[320px]"
      search={{ registry: item.name }}
      to="/registry"
    >
      {/* Rank Badge */}
      <div
        className={`absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shadow-md ${rankColor}`}
      >
        {index + 1}
      </div>

      {/* Growth indicator glow */}
      {isPositiveGrowth && (
        <div className="absolute -right-2 -top-2 h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
      )}

      <div className="flex h-full flex-col">
        {/* Title */}
        <div className="mb-4 flex-1">
          <h3 className="font-display text-foreground group-hover/trending:text-primary line-clamp-2 text-lg font-bold leading-tight transition-colors duration-200">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-muted-foreground/80 mt-2 line-clamp-2 text-sm leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-foreground text-lg font-bold tabular-nums">
                {item.total_items.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">
                Repos
              </span>
            </div>
          </div>

          {/* Growth Badge with enhanced styling */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              isPositiveGrowth
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            <span>{growthPercent}</span>
          </div>
        </div>
      </div>

      {/* Hover gradient effect */}
      <div className="from-primary/0 via-primary/5 to-primary/0 pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover/trending:opacity-100" />
    </Link>
  )
}
