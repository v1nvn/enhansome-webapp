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
      className={`border-border bg-card hover:border-primary/50 relative flex flex-col rounded-sm border p-4 shadow-sm transition-all duration-200 ${
        isSelected ? 'ring-primary ring-2' : ''
      }`}
    >
      {/* Compare Checkbox */}
      {isCompareMode && (
        <label className="sr-only" htmlFor={`compare-${item.title}`}>
          Compare {item.title}
        </label>
      )}
      {isCompareMode && (
        <div className="absolute right-3 top-3 z-10">
          <input
            checked={isSelected}
            className="border-border bg-background focus:ring-primary h-4 w-4 cursor-pointer rounded-sm border"
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
            <span className="inline-flex items-center gap-1 rounded-sm bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
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
          <div className="border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-2.5 text-xs">
            {item.repo_info.language && (
              <span className="rounded-sm bg-indigo-100 px-2 py-0.5 font-mono text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
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
          <div className="flex gap-2 pt-1">
            {repoDetailLink && (
              <Link
                className="bg-muted hover:bg-muted/80 text-foreground border-border flex flex-1 cursor-pointer items-center justify-center rounded-sm border px-3 py-2 text-xs font-semibold transition-all"
                to={repoDetailLink}
              >
                <span>Details</span>
              </Link>
            )}
            <a
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold shadow-sm transition-all"
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
              className={`w-full rounded-sm border px-3 py-2 text-xs font-medium transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
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
