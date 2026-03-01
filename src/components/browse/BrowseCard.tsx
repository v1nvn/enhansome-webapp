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
    <div className="bg-card duration-250 group relative rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      {/* Three-dot menu for compare */}
      <div className="absolute right-4 top-4 z-10">
        <button
          aria-label="Add to compare"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100"
          onClick={onCompareToggle}
          type="button"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Title as main link */}
      {item.repo_info ? (
        <Link
          className="font-display text-foreground hover:text-primary block text-lg font-semibold leading-tight transition-colors"
          params={{
            owner: item.repo_info.owner,
            name: item.repo_info.repo,
          }}
          to="/repo/$owner/$name"
        >
          {item.title}
        </Link>
      ) : (
        <h3 className="font-display text-foreground text-lg font-semibold leading-tight">
          {item.title}
        </h3>
      )}

      {/* Description - 1 line only */}
      <p className="text-muted-foreground mb-4 mt-2 line-clamp-1 text-sm leading-relaxed">
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
              <span className="bg-accent/20 text-primary hover:bg-accent/30 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 pr-3 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <span className="bg-primary/60 group-hover/category:bg-primary h-1 w-1 rounded-full" />
                {category}
              </span>
            </Link>
          ))}
          {item.categories.length > 2 && (
            <span className="text-muted-foreground text-xs font-medium">
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
          <span className="bg-muted/40 text-muted-foreground rounded-lg px-2 py-1 font-medium">
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
          <div className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.repo_info.last_commit)}</span>
          </div>
        )}
      </div>

      {/* Action Button - GitHub icon only */}
      {item.repo_info?.owner && item.repo_info.repo && (
        <div className="mt-4">
          <a
            className="bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
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
