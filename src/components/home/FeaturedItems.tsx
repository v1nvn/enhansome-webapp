import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

import { featuredQueryOptions } from '@/lib/server-functions'

export function FeaturedItems() {
  const { data: featured } = useSuspenseQuery(featuredQueryOptions())

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary h-5 w-5" />
        <h2 className="font-display text-foreground text-xl font-semibold">
          Featured Collections
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {featured.slice(0, 4).map(item => (
          <Link
            className="border-border bg-card hover:border-primary/50 group rounded-xl border p-4 transition-all hover:shadow-md"
            key={item.name}
            params={{ name: item.name }}
            to="/registry/$name"
          >
            {item.editorial_badge && (
              <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
                {item.editorial_badge}
              </span>
            )}
            <h3 className="text-foreground group-hover:text-primary font-semibold transition-colors">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {item.description}
            </p>
            <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
              <span>{item.total_items.toLocaleString()} items</span>
              <span>•</span>
              <span>{item.total_stars.toLocaleString()} stars</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
