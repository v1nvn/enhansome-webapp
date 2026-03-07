import { Link } from '@tanstack/react-router'
import { Package } from 'lucide-react'

import type { TrendingRegistry } from '@/lib/api/server-functions'

interface RegistryExplorerProps {
  registries: TrendingRegistry[]
}

export function RegistryExplorer({ registries }: RegistryExplorerProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-primary">
          <Package className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Explore by Registry
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {registries.map(registry => (
          <Link
            className="group rounded-xl bg-card p-5 shadow-md transition-all duration-250 hover:-translate-y-0.5 hover:shadow-xl"
            key={registry.name}
            params={{ name: registry.name }}
            to="/registry/$name"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-foreground transition-colors group-hover:text-primary">
                {registry.title}
              </h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {registry.total_items.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {registry.description}
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{(registry.total_stars / 1000).toFixed(0)}k stars</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
