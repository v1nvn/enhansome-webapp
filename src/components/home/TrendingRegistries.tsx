import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'

import { trendingQueryOptions } from '@/lib/server-functions'

export function TrendingRegistries() {
  const { data: trending } = useSuspenseQuery(trendingQueryOptions())

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="from-primary/20 to-accent/20 rounded-lg bg-gradient-to-br p-1.5">
          <TrendingUp className="text-primary h-4 w-4" />
        </div>
        <h2 className="font-display text-foreground text-xl font-semibold">
          Trending Registries
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trending.slice(0, 6).map(registry => (
          <Link
            className="bg-card duration-250 group relative overflow-hidden rounded-xl p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl"
            key={registry.name}
            params={{ name: registry.name }}
            to="/registry/$name"
          >
            {/* Subtle gradient on hover */}
            <div className="from-primary/0 via-primary/5 to-primary/0 duration-250 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative">
              <h3 className="text-foreground group-hover:text-primary font-semibold transition-colors">
                {registry.title}
              </h3>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                {registry.description}
              </p>
              <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
                <span>{registry.total_items.toLocaleString()} items</span>
                <span className="text-border/40">•</span>
                <span>{registry.total_stars.toLocaleString()} stars</span>
                {registry.starsGrowth > 0 && (
                  <>
                    <span className="text-border/40">•</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      +{registry.starsGrowth.toLocaleString()} this week
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
