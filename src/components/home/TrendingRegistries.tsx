import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'

import { trendingQueryOptions } from '@/lib/server-functions'

export function TrendingRegistries() {
  const { data: trending } = useSuspenseQuery(trendingQueryOptions())

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="text-primary h-5 w-5" />
        <h2 className="font-display text-foreground text-xl font-semibold">
          Trending Registries
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trending.slice(0, 6).map(registry => (
          <Link
            className="border-border bg-card hover:border-primary/50 group rounded-xl border p-4 transition-all hover:shadow-md"
            key={registry.name}
            params={{ name: registry.name }}
            to="/registry/$name"
          >
            <h3 className="text-foreground group-hover:text-primary font-semibold transition-colors">
              {registry.title}
            </h3>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {registry.description}
            </p>
            <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
              <span>{registry.total_items.toLocaleString()} items</span>
              <span>•</span>
              <span>{registry.total_stars.toLocaleString()} stars</span>
              {registry.starsGrowth > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{registry.starsGrowth.toLocaleString()} this week
                  </span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
