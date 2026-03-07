import { Link } from '@tanstack/react-router'
import { Calendar, ExternalLink, MoreVertical, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface BrowseCardProps {
  item: RegistryItem
  onCompareToggle?: () => void
}

export function BrowseCard({ item, onCompareToggle }: BrowseCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  return (
    <div className="group relative rounded-2xl bg-card p-5 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-xl">
      {/* Three-dot menu for compare */}
      <div className="absolute top-4 right-4 z-10">
        <button
          aria-label="Add to compare"
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          onClick={onCompareToggle}
          type="button"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Title as main link */}
      {item.repo_info ? (
        <Link
          className="font-display block text-lg leading-tight font-semibold text-foreground transition-colors hover:text-primary"
          params={{
            owner: item.repo_info.owner,
            name: item.repo_info.repo,
          }}
          to="/repo/$owner/$name"
        >
          {item.title}
        </Link>
      ) : (
        <h3 className="font-display text-lg leading-tight font-semibold text-foreground">
          {item.title}
        </h3>
      )}

      {/* Description - 1 line only */}
      <p className="mt-2 mb-4 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
        {item.description ?? ''}
      </p>

      {/* Category Pills - Editorial Style */}
      {item.categories && item.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {item.categories.slice(0, 2).map(category => (
            <Link
              className="font-display group/category relative inline-flex items-center"
              key={category}
              params={{
                cat: category,
              }}
              to="/browse"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1 pr-3 text-xs font-medium text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/30 hover:shadow-md">
                <span className="h-1 w-1 rounded-full bg-primary/60 group-hover/category:bg-primary" />
                {category}
              </span>
            </Link>
          ))}
          {item.categories.length > 2 && (
            <span className="text-xs font-medium text-muted-foreground">
              +{item.categories.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Metadata Row with language at bottom */}
      <div className="flex items-center gap-3 text-xs">
        {item.repo_info?.language && (
          <span className="rounded-lg bg-muted/40 px-2 py-1 font-medium text-muted-foreground">
            {item.repo_info.language}
          </span>
        )}
        {item.repo_info?.stars !== undefined && (
          <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="font-mono">
              {item.repo_info.stars.toLocaleString()}
            </span>
          </div>
        )}
        {item.repo_info?.last_commit && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.repo_info.last_commit)}</span>
          </div>
        )}
      </div>

      {/* Action Button - GitHub icon only */}
      {item.repo_info?.owner && item.repo_info.repo && (
        <div className="mt-4">
          <a
            className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
            rel="noopener noreferrer"
            target="_blank"
            title="View on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      )}
    </div>
  )
}
