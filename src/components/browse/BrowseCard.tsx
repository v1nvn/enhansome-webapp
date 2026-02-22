import { Calendar, ExternalLink, MoreVertical, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface BrowseCardProps {
  item: RegistryItem
  onCompareToggle?: () => void
}

export function BrowseCard({ item, onCompareToggle }: BrowseCardProps) {
  const repoDetailLink =
    item.repo_info?.owner && item.repo_info.repo
      ? `/repo/${item.repo_info.owner}/${item.repo_info.repo}`
      : null

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
      {repoDetailLink ? (
        <a
          className="font-display text-foreground hover:text-primary block text-lg font-semibold leading-tight transition-colors"
          href={repoDetailLink}
        >
          {item.title}
        </a>
      ) : (
        <h3 className="font-display text-foreground text-lg font-semibold leading-tight">
          {item.title}
        </h3>
      )}

      {/* Description - 1 line only */}
      <p className="text-muted-foreground mb-4 mt-2 line-clamp-1 text-sm leading-relaxed">
        {item.description ?? ''}
      </p>

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
