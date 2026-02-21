import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

import { featuredQueryOptions } from '@/lib/server-functions'

export function FeaturedItems() {
  const { data: featured } = useSuspenseQuery(featuredQueryOptions())

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="from-primary/20 to-accent/20 rounded-lg bg-gradient-to-br p-1.5">
          <Sparkles className="text-primary h-4 w-4" />
        </div>
        <h2 className="font-display text-foreground text-xl font-semibold">
          Featured Collections
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {featured.slice(0, 4).map(item => (
          <Link
            className="bg-card duration-250 group relative overflow-hidden rounded-xl p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl"
            key={item.name}
            params={{ name: item.name }}
            to="/registry/$name"
          >
            {/* Subtle gradient on hover */}
            <div className="from-primary/0 via-primary/5 to-primary/0 duration-250 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative">
              {item.editorial_badge && (
                <span className="from-primary/15 to-accent/15 text-primary mb-2 inline-block rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold">
                  {item.editorial_badge}
                </span>
              )}
              <h3 className="text-foreground group-hover:text-primary font-semibold transition-colors">
                {item.title}
              </h3>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                {item.description}
              </p>
              <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
                <span>{item.total_items.toLocaleString()} items</span>
                <span className="text-border/40">•</span>
                <span>{item.total_stars.toLocaleString()} stars</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
