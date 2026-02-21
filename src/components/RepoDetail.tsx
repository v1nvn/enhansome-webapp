import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  Code,
  ExternalLink,
  FolderTree,
  Star,
  TrendingUp,
} from 'lucide-react'

import type { RepoDetail as RepoDetailType } from '@/lib/server-functions'

interface RepoDetailProps {
  data: RepoDetailType
}

export function RepoDetail({ data }: RepoDetailProps) {
  const formatDate = (dateStr: null | string) => {
    if (!dateStr) return 'Unknown'
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

  const formatStars = (stars: number) => {
    if (stars >= 1000000) return `${(stars / 1000000).toFixed(1)}M`
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}K`
    return stars.toString()
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Back Button */}
      <div className="border-border/30 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            className="text-muted-foreground hover:text-primary hover:bg-primary/5 -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200"
            search={{ registry: data.registryName }}
            to="/browse"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to browse</span>
          </Link>
        </div>
      </div>

      {/* Hero Header with gradient background */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="from-primary/15 via-accent/10 to-primary/5 absolute inset-0 bg-gradient-to-br" />
          <div className="bg-primary/10 absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 rounded-full blur-[100px]" />
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          {/* Repository Header Card */}
          <div className="border-border/60 bg-card/90 relative overflow-hidden rounded-3xl border p-8 shadow-2xl backdrop-blur-sm md:p-10">
            {/* Decorative top accent */}
            <div className="from-primary via-accent to-primary absolute left-0 right-0 top-0 h-1 bg-gradient-to-r" />

            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
              {/* Repo Info */}
              <div className="flex-1">
                {/* Owner/Name with enhanced styling */}
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-xl shadow-gray-900/20">
                    <svg
                      className="h-8 w-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        fillRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm font-medium">
                      {data.owner}
                    </div>
                    <h1 className="font-display text-foreground text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                      {data.name}
                    </h1>
                  </div>
                </div>

                {/* Description */}
                {data.description && (
                  <p className="text-muted-foreground/90 mt-8 max-w-2xl text-lg leading-relaxed">
                    {data.description}
                  </p>
                )}

                {/* Enhanced Stats Grid */}
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <RepoStat
                    icon={Star}
                    iconBg="from-amber-100 to-amber-50 text-amber-600 dark:from-amber-950/50 dark:to-amber-950/20 dark:text-amber-400"
                    label="Stars"
                    value={formatStars(data.stars)}
                  />
                  {data.language && (
                    <RepoStat
                      icon={Code}
                      iconBg="from-indigo-100 to-indigo-50 text-indigo-600 dark:from-indigo-950/50 dark:to-indigo-950/20 dark:text-indigo-400"
                      label="Language"
                      value={data.language}
                    />
                  )}
                  {data.lastCommit && (
                    <RepoStat
                      icon={Calendar}
                      iconBg="from-emerald-100 to-emerald-50 text-emerald-600 dark:from-emerald-950/50 dark:to-emerald-950/20 dark:text-emerald-400"
                      label="Updated"
                      value={formatDate(data.lastCommit)}
                    />
                  )}
                  {data.categories.length > 0 && (
                    <RepoStat
                      icon={FolderTree}
                      iconBg="from-primary/20 to-primary/5 text-primary"
                      label={
                        data.categories.length === 1 ? 'Category' : 'Categories'
                      }
                      value={data.categories.length.toString()}
                    />
                  )}
                </div>

                {/* Categories Display */}
                {data.categories.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {data.categories.length === 1
                        ? 'Category:'
                        : 'Categories:'}
                    </span>
                    {data.categories.map(cat => (
                      <CategoryBadge category={cat} key={cat} />
                    ))}
                  </div>
                )}

                {/* Multiple Registries Display */}
                {data.registries.length > 1 && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Also in:
                    </span>
                    {data.registries
                      .filter(r => r.name !== data.registryName)
                      .map(r => (
                        <Link
                          className="bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200"
                          key={`registry-${r.name}`}
                          search={{ registry: r.name }}
                          to="/browse"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          {r.name}
                        </Link>
                      ))}
                  </div>
                )}
              </div>

              {/* View on GitHub Button - Enhanced */}
              <a
                className="group/btn relative flex shrink-0 flex-col items-center gap-3 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6 font-semibold text-white shadow-xl shadow-gray-900/20 transition-all duration-300 hover:-translate-y-1 hover:from-gray-900 hover:to-black hover:shadow-2xl hover:shadow-gray-900/30 lg:flex-row"
                href={`https://github.com/${data.owner}/${data.name}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg
                  className="h-7 w-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    fillRule="evenodd"
                  />
                </svg>
                <div className="text-center lg:text-left">
                  <div className="text-sm font-medium opacity-80">View on</div>
                  <div className="text-lg">GitHub</div>
                </div>
                <ExternalLink className="h-5 w-5 transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Related Repositories Section */}
      {data.relatedRepos.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-foreground text-2xl font-bold">
                Related Repositories
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Related repositories you might find interesting
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.relatedRepos.map(repo => (
              <div
                className="border-border/60 bg-card/80 group/rel relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                key={`related-${repo.owner || 'unknown'}-${repo.name || 'unknown'}`}
              >
                {/* Animated accent */}
                <div className="from-primary/60 via-primary/40 to-accent/40 absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover/rel:w-full" />

                {/* Hover gradient overlay */}
                <div className="from-primary/0 via-primary/5 to-primary/0 pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover/rel:opacity-100" />

                <div className="relative mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground group-hover/rel:text-primary truncate font-bold leading-tight transition-colors duration-200">
                      {repo.name}
                    </h3>
                    {repo.owner && (
                      <p className="text-muted-foreground mt-1.5 text-sm">
                        {repo.owner}
                      </p>
                    )}
                    {/* Categories badges */}
                    {repo.categories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {repo.categories.slice(0, 2).map(cat => (
                          <span
                            className="bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                            key={cat}
                          >
                            {cat}
                          </span>
                        ))}
                        {repo.categories.length > 2 && (
                          <span className="bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                            +{repo.categories.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{repo.stars.toLocaleString()}</span>
                  </div>

                  {repo.owner && repo.name && (
                    <a
                      className="bg-muted text-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-primary/20 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 hover:shadow-md"
                      href={`https://github.com/${repo.owner}/${repo.name}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Badge component for displaying categories
 */
function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="bg-primary/10 hover:bg-primary/20 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200">
      {category}
    </span>
  )
}

// Repo Stat Component
function RepoStat({
  icon: Icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ElementType
  iconBg: string
  label: string
  value: number | string
}) {
  return (
    <div className="group/stat">
      <div
        className={`bg-gradient-to-br ${iconBg} flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover/stat:scale-110`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-2">
        <div className="text-foreground text-lg font-bold tabular-nums sm:text-xl">
          {value}
        </div>
        <div className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  )
}
