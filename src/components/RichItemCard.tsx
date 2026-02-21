import { Link } from '@tanstack/react-router'
import { Archive, Calendar, ExternalLink, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

import { BestForTag } from './BestForTag'
import { ComplexityBadge } from './ComplexityBadge'

interface RichItemCardProps {
  isCompareMode?: boolean
  isSelected?: boolean
  item: RegistryItem
  onCompareToggle?: () => void
}

export function RichItemCard({
  item,
  isCompareMode = false,
  isSelected = false,
  onCompareToggle,
}: RichItemCardProps) {
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

  const getActivityStatus = (lastCommit: string) => {
    const date = new Date(lastCommit)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days < 90)
      return {
        label: 'Active',
        color: 'text-emerald-700 dark:text-emerald-400',
      }
    if (days < 365)
      return { label: 'Moderate', color: 'text-amber-700 dark:text-amber-400' }
    return { label: 'Stable', color: 'text-muted-foreground' }
  }

  const activityStatus = item.repo_info?.last_commit
    ? getActivityStatus(item.repo_info.last_commit)
    : null

  return (
    <div
      className={`bg-card duration-250 relative flex flex-col rounded-xl p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${
        isSelected ? 'ring-primary/50 shadow-primary/20 ring-2' : ''
      }`}
    >
      {/* Compare Checkbox */}
      {isCompareMode && (
        <label className="sr-only" htmlFor={`compare-${item.title}`}>
          Compare {item.title}
        </label>
      )}
      {isCompareMode && (
        <div className="absolute right-4 top-4 z-10">
          <input
            checked={isSelected}
            className="border-border/50 bg-background/80 focus:ring-primary hover:border-primary/50 h-4 w-4 cursor-pointer rounded border backdrop-blur-sm transition-all focus:ring-offset-0"
            id={`compare-${item.title}`}
            onChange={onCompareToggle}
            type="checkbox"
          />
        </div>
      )}

      {/* Title and Badges */}
      <div className="mb-3 pr-12">
        {repoDetailLink ? (
          <Link
            className="font-display text-foreground hover:text-primary mb-2 line-clamp-2 block text-lg font-semibold leading-tight transition-colors"
            to={repoDetailLink}
          >
            {item.title}
          </Link>
        ) : (
          <h3 className="font-display text-foreground mb-2 line-clamp-2 text-lg font-semibold leading-tight">
            {item.title}
          </h3>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {item.repo_info?.archived && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100/80 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              <Archive className="h-3 w-3" />
              Archived
            </span>
          )}
          {item.complexity && <ComplexityBadge complexity={item.complexity} />}
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground font-body mb-3 line-clamp-2 flex-1 text-sm leading-relaxed">
        {item.description ?? ''}
      </p>

      {/* Best For Tag */}
      {item.best_for_tags && item.best_for_tags.length > 0 && (
        <div className="mb-3">
          <BestForTag tags={item.best_for_tags} />
        </div>
      )}

      {/* Metadata Grid */}
      {item.repo_info && (
        <div className="space-y-2.5">
          {/* Stars and Activity */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-mono">
                {item.repo_info.stars.toLocaleString()}
              </span>
            </div>
            {activityStatus && (
              <span className={`text-xs font-medium ${activityStatus.color}`}>
                {activityStatus.label}
              </span>
            )}
          </div>

          {/* Language, License, Updated */}
          <div className="border-border/30 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs">
            {item.repo_info.language && (
              <span className="rounded-lg bg-indigo-100/80 px-2 py-0.5 font-mono text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                {item.repo_info.language}
              </span>
            )}
            {item.license && (
              <span className="text-muted-foreground font-mono">
                {item.license}
              </span>
            )}
            {item.repo_info.last_commit && (
              <div className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(item.repo_info.last_commit)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {repoDetailLink && (
              <Link
                className="bg-muted/60 hover:bg-muted text-foreground flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold shadow-sm transition-all hover:shadow"
                to={repoDetailLink}
              >
                <span>Details</span>
              </Link>
            )}
            <a
              className="from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br px-3 py-2.5 text-xs font-semibold shadow-md transition-all hover:shadow-lg"
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Compare Button (always visible) */}
          {onCompareToggle && (
            <button
              className={`w-full rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-primary/10 text-primary shadow-inner'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground shadow-sm'
              }`}
              onClick={onCompareToggle}
              type="button"
            >
              {isSelected ? '✓ Selected' : '+ Compare'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
