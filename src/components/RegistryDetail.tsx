import { useState } from 'react'

import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Calendar,
  Code,
  ExternalLink,
  FolderTree,
  Star,
} from 'lucide-react'

import type { RegistryDetail as RegistryDetailType } from '@/lib/api/server-functions'

interface RegistryDetailProps {
  data: RegistryDetailType
}

type TabType = 'categories' | 'repos' | 'stats'

export function RegistryDetail({ data }: RegistryDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('repos')

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

  const tabs: { icon: React.ElementType; id: TabType; label: string }[] = [
    { id: 'repos', label: 'Top Repositories', icon: Star },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button - Minimal floating style */}
      <div className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-primary"
            to="/browse"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to browse</span>
          </Link>
        </div>
      </div>

      {/* Hero Header Section - Dramatic gradient background */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] -translate-x-1/2 translate-y-1/2 animate-pulse rounded-full bg-accent/10 blur-[100px]" />
          {/* Subtle grid pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          {/* Breadcrumb - Refined */}
          <nav className="mb-8 flex items-center gap-2 text-sm">
            <Link
              className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              to="/"
            >
              Home
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <Link
              className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
              to="/browse"
            >
              Browse
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="font-medium text-foreground">{data.title}</span>
          </nav>

          {/* Title Section */}
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              {/* Decorative tag */}
              <div className="mb-6 inline-flex">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                  Registry Collection
                </span>
              </div>

              <h1 className="font-display text-4xl leading-tight font-bold text-foreground md:text-5xl lg:text-7xl xl:text-8xl">
                {data.title}
              </h1>
              {data.description && (
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
                  {data.description}
                </p>
              )}

              {/* Stats Row - Enhanced */}
              <div className="mt-10 flex flex-wrap items-center gap-8">
                <StatCard
                  icon={Code}
                  iconBg="bg-primary/10 text-primary"
                  label="Repositories"
                  value={data.total_items.toLocaleString()}
                />
                <StatCard
                  icon={Star}
                  iconBg="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  label="Total Stars"
                  value={data.total_stars.toLocaleString()}
                />
                {data.last_updated && (
                  <StatCard
                    icon={Calendar}
                    iconBg="bg-accent/30 text-foreground"
                    label="Last Updated"
                    value={formatDate(data.last_updated)}
                  />
                )}
              </div>
            </div>

            {/* External Link - Floating card style */}
            {data.source_repository && (
              <a
                className="group/link relative -mt-4 flex shrink-0 items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-6 py-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-primary/20"
                href={data.source_repository}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-inner">
                  <svg
                    className="h-6 w-6"
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
                  <div className="text-sm font-semibold text-foreground">
                    View Source
                  </div>
                  <div className="text-xs text-muted-foreground">on GitHub</div>
                </div>
                <ExternalLink className="ml-2 h-5 w-5 text-primary transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
            )}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Enhanced Tabs with pill design */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-4">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  className={`relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                  }}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div key={activeTab}>
          {activeTab === 'repos' && <TopReposTab topRepos={data.topRepos} />}
          {activeTab === 'categories' && (
            <CategoriesTab categories={data.categories} />
          )}
          {activeTab === 'stats' && (
            <StatsTab
              categories={data.categories}
              languages={data.languages}
              totalItems={data.total_items}
              totalStars={data.total_stars}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Categories Tab Component - Enhanced design
function CategoriesTab({ categories }: { categories: string[] }) {
  if (categories.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
          <FolderTree className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No categories found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map(category => (
        <div
          className="group/category relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
          key={`cat-${category.replace(/\s+/g, '-')}`}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover/category:opacity-100" />
          <div className="absolute top-0 left-0 h-1 w-0 bg-primary transition-all duration-300 group-hover/category:w-full" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary transition-transform duration-300 group-hover/category:scale-110 group-hover/category:rotate-3">
              <FolderTree className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-foreground transition-colors duration-200 group-hover/category:text-primary">
                {category}
              </h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Stat Card Component for cleaner code
function StatCard({
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
    <div className="group/stat flex items-center gap-3">
      <div
        className={`${iconBg} flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover/stat:scale-110`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-bold text-foreground tabular-nums">
          {value}
        </div>
        <div className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
      </div>
    </div>
  )
}

// Stats Card Component
function StatsCard({
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
    <div className="group/card rounded-2xl border border-border/60 bg-card/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-3">
        <div
          className={`${iconBg} flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover/card:scale-110`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Stats Tab Component - Enhanced with better visual hierarchy
function StatsTab({
  categories,
  languages,
  totalItems,
  totalStars,
}: {
  categories: string[]
  languages: string[]
  totalItems: number
  totalStars: number
}) {
  return (
    <div className="space-y-10">
      {/* Overview Stats - Card grid with enhanced styling */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Code}
          iconBg="from-primary/20 to-primary/10 text-primary"
          label="Total Repositories"
          value={totalItems.toLocaleString()}
        />
        <StatsCard
          icon={Star}
          iconBg="from-amber-100 to-amber-50 text-amber-600 dark:from-amber-950/50 dark:to-amber-950/20 dark:text-amber-400"
          label="Total Stars"
          value={totalStars.toLocaleString()}
        />
        <StatsCard
          icon={FolderTree}
          iconBg="from-accent/30 to-accent/10 text-foreground"
          label="Categories"
          value={categories.length}
        />
        <StatsCard
          icon={BarChart3}
          iconBg="from-indigo-100 to-indigo-50 text-indigo-600 dark:from-indigo-950/50 dark:to-indigo-950/20 dark:text-indigo-400"
          label="Languages"
          value={languages.length}
        />
      </div>

      {/* Languages List - Pill cloud design */}
      {languages.length > 0 && (
        <div>
          <h3 className="font-display mb-5 flex items-center gap-3 text-xl font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Code className="h-4 w-4" />
            </div>
            Languages
          </h3>
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
            <div className="flex flex-wrap gap-2">
              {languages.map(lang => (
                <span
                  className="group/lang inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-primary/10"
                  key={`lang-${lang.replace(/\s+/g, '-')}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary transition-transform duration-200 group-hover/lang:scale-125" />
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories List - Refined list design */}
      {categories.length > 0 && (
        <div>
          <h3 className="font-display mb-5 flex items-center gap-3 text-xl font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/30 text-foreground">
              <FolderTree className="h-4 w-4" />
            </div>
            All Categories
          </h3>
          <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card/80">
            <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {categories.map(category => (
                <div
                  className="group/cat flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted/30 hover:text-foreground"
                  key={`cat-list-${category.replace(/\s+/g, '-')}`}
                >
                  <FolderTree className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover/cat:scale-110" />
                  <span className="truncate">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Top Repos Tab Component - Enhanced with ranking badges
function TopReposTab({
  topRepos,
}: {
  topRepos: RegistryDetailType['topRepos']
}) {
  if (topRepos.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
          <Archive className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No repositories found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {topRepos.map((repo, idx) => (
        <div
          className="group/repo relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          key={`repo-${repo.owner || 'unknown'}-${repo.name || 'unknown'}`}
        >
          {/* Top 3 special badges */}
          {idx < 3 && (
            <div
              className={`absolute -top-4 -right-4 h-16 w-16 rotate-12 opacity-10 ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}
            />
          )}

          {/* Animated accent bar */}
          <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary/40 to-accent/40 transition-all duration-300 group-hover/repo:h-1 group-hover/repo:from-primary group-hover/repo:to-accent" />

          <div className="relative flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              {/* Rank badge */}
              <div className="mb-4 flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                    idx === 0
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                      : idx === 1
                        ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-400/30'
                        : idx === 2
                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg shadow-amber-700/30'
                          : 'bg-primary/10 text-primary'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl leading-tight font-bold text-foreground transition-colors duration-200 group-hover/repo:text-primary">
                    {repo.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3 text-sm">
                    {repo.owner && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                        {repo.owner}
                      </span>
                    )}
                    {repo.categories.length > 0 && (
                      <>
                        <span className="text-muted-foreground/30">•</span>
                        <div className="flex items-center gap-1">
                          {repo.categories.slice(0, 2).map(cat => (
                            <span
                              className="rounded-md border border-border/40 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                              key={cat}
                            >
                              {cat}
                            </span>
                          ))}
                          {repo.categories.length > 2 && (
                            <span className="text-xs text-muted-foreground/60">
                              +{repo.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {repo.description && (
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
                  {repo.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-5 text-sm">
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span>{repo.stars.toLocaleString()}</span>
                  <span className="font-normal text-muted-foreground/40">
                    stars
                  </span>
                </div>
                {repo.language && (
                  <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {repo.language}
                  </span>
                )}
              </div>
            </div>

            {repo.owner && repo.name && (
              <a
                className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
                href={`https://github.com/${repo.owner}/${repo.name}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>View</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
