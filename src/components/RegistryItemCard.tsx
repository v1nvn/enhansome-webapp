import { Archive, Calendar, ExternalLink, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface RegistryItemCardProps {
  item: RegistryItem
  registry: string
  section: string
}

export function RegistryItemCard({
  item,
  registry,
  section,
}: RegistryItemCardProps) {
  return (
    <div className="border-border bg-card group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Decorative accent bar */}
      <div className="bg-primary absolute left-0 top-0 h-1 w-0 transition-all duration-300 group-hover:w-full" />

      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-foreground group-hover:text-primary truncate text-lg font-semibold transition-colors">
            {item.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-primary text-xs font-medium">{registry}</span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-muted-foreground text-xs">{section}</span>
          </div>
        </div>
        {item.repo_info?.archived && (
          <div className="ml-2 flex shrink-0 items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <Archive className="h-3 w-3" />
            <span>Archived</span>
          </div>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
          {item.description}
        </p>
      )}

      {/* Repo Info */}
      {item.repo_info && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              {item.repo_info.stars.toLocaleString()}
            </span>
            {item.repo_info.language && (
              <span className="bg-muted text-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                {item.repo_info.language}
              </span>
            )}
          </div>

          <div className="border-border flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(item.repo_info.last_commit).toLocaleDateString()}
            </span>
            <a
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>View</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
