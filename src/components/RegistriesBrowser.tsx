import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Database,
  GitBranch,
  Star,
} from 'lucide-react'

import {
  metadataQueryOptions,
  type RegistryMetadataWithStats,
} from '@/lib/server-functions'

interface RegistriesBrowserProps {
  searchQuery?: string
}

// Registry groupings by ecosystem
const ecosystemGroups: Record<string, RegExp[]> = {
  'JavaScript Ecosystem': [
    /javascript|js|node|react|vue|angular|next\.js|nestjs/i,
  ],
  'Python Ecosystem': [/python|django|flask|fastapi|jupyter/i],
  'DevOps & Infrastructure': [/docker|kubernetes|devops|terraform|ansible/i],
  Languages: [/rust|go|java|c\+\+|c#|ruby|php|swift|kotlin/i],
  'Data & ML': [/machine.?learning|ai|data.?science|jupyter|tensor|pytorch/i],
  'Web Development': [/web|frontend|backend|api|graphql|rest/i],
  Mobile: [/mobile|ios|android|react.?native|flutter/i],
  Cloud: [/aws|azure|gcp|cloud/i],
}

interface RegistryCardProps {
  index: number
  onNavigate?: () => void
  registry: RegistryMetadataWithStats
}

export function RegistriesBrowser({ searchQuery }: RegistriesBrowserProps) {
  const { data: registries } = useSuspenseQuery(metadataQueryOptions())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(Object.keys(ecosystemGroups).concat('Other')),
  )

  // Filter by search query
  const filteredRegistries = searchQuery
    ? registries.filter(
        r =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : registries

  // Group registries by ecosystem
  const groupedRegistries = filteredRegistries.reduce<
    Record<string, RegistryMetadataWithStats[]>
  >((acc, registry) => {
    const group = getEcosystemGroup(registry.name)
    acc[group] ??= []
    acc[group].push(registry)
    return acc
  }, {})

  // Sort groups by name, but keep 'Other' last
  const sortedGroups = Object.entries(groupedRegistries).sort(([a], [z]) => {
    if (a === 'Other') return 1
    if (z === 'Other') return -1
    return a.localeCompare(z)
  })

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  return (
    <div className="space-y-10">
      {sortedGroups.map(([groupName, items]) => {
        const isExpanded = expandedGroups.has(groupName)
        return (
          <div key={groupName}>
            {/* Enhanced Group Header */}
            <button
              className="group/header border-border/60 bg-card/80 hover:bg-card hover:border-primary/20 mb-5 flex w-full items-center justify-between rounded-2xl border px-6 py-4 backdrop-blur-sm transition-all duration-200"
              onClick={() => {
                toggleGroup(groupName)
              }}
              type="button"
            >
              <div className="flex items-center gap-4">
                <div className="from-primary/10 to-accent/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br">
                  <Database className="h-5 w-5" />
                </div>
                <h2 className="font-display text-foreground text-xl font-bold">
                  {groupName}
                </h2>
                <span className="bg-muted/50 text-foreground rounded-full px-3 py-1 text-sm font-semibold tabular-nums">
                  {items.length}
                </span>
              </div>
              <ChevronDown
                className={`text-muted-foreground h-5 w-5 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Registry Grid with staggered animation */}
            {isExpanded && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => (
                  <RegistryCard
                    index={idx}
                    key={item.name}
                    onNavigate={() => {
                      globalThis.window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                      })
                    }}
                    registry={item}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {filteredRegistries.length === 0 && (
        <div className="border-border/60 bg-card/80 rounded-2xl border px-8 py-20 text-center backdrop-blur-sm">
          <Database className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-lg font-medium">
            No registries found
          </p>
          <p className="text-muted-foreground/60 mt-2 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  )
}

function getEcosystemGroup(name: string): string {
  const lowerName = name.toLowerCase()
  for (const [group, patterns] of Object.entries(ecosystemGroups)) {
    if (patterns.some(pattern => pattern.test(lowerName))) {
      return group
    }
  }
  return 'Other'
}

function RegistryCard({ registry, index, onNavigate }: RegistryCardProps) {
  const animationDelay = `${index * 50}ms`

  return (
    <Link
      className="group/card border-border/60 bg-card/80 hover:shadow-primary/5 hover:border-primary/20 relative block overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => {
        onNavigate?.()
      }}
      params={{ name: registry.name }}
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay,
        opacity: 0,
      }}
      to="/registry/$name"
    >
      {/* Decorative gradient on hover */}
      <div className="from-primary/0 via-primary/5 to-primary/0 pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      {/* Decorative corner accent */}
      <div className="bg-primary/5 group-hover/card:bg-primary/10 absolute -right-8 -top-8 h-24 w-24 rounded-full transition-all duration-500 group-hover/card:scale-150" />

      <div className="relative p-6">
        {/* Card Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-foreground group-hover/card:text-primary line-clamp-1 text-lg font-bold transition-colors duration-200">
              {registry.title}
            </h3>
            {registry.description && (
              <p className="text-muted-foreground/80 mt-2 line-clamp-2 text-sm leading-relaxed">
                {registry.description}
              </p>
            )}
          </div>
          <div className="bg-primary/10 text-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover/card:scale-110">
            <ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover/card:translate-x-0.5" />
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="from-muted/50 to-muted/30 group-hover/card:from-primary/5 group-hover/card:to-primary/0 flex items-center gap-2.5 rounded-xl bg-gradient-to-br px-3 py-2.5 transition-all duration-200">
            <Database className="text-primary h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-bold tabular-nums">
                {registry.stats.totalRepos.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">
                Repos
              </span>
            </div>
          </div>

          <div className="from-muted/50 to-muted/30 flex items-center gap-2.5 rounded-xl bg-gradient-to-br px-3 py-2.5 transition-all duration-200 group-hover/card:from-amber-50/50 group-hover/card:to-amber-50/0 dark:group-hover/card:from-amber-950/20 dark:group-hover/card:to-transparent">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-bold tabular-nums">
                {registry.stats.totalStars.toLocaleString()}
              </span>
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">
                Stars
              </span>
            </div>
          </div>

          <div className="from-muted/50 to-muted/30 group-hover/card:from-chart-3/10 group-hover/card:to-chart-3/0 flex items-center gap-2.5 rounded-xl bg-gradient-to-br px-3 py-2.5 transition-all duration-200">
            <GitBranch className="text-chart-3 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-bold tabular-nums">
                {registry.stats.languages.length}
              </span>
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">
                Languages
              </span>
            </div>
          </div>

          {registry.stats.latestUpdate && (
            <div className="from-muted/50 to-muted/30 group-hover/card:from-chart-4/10 group-hover/card:to-chart-4/0 flex items-center gap-2.5 rounded-xl bg-gradient-to-br px-3 py-2.5 transition-all duration-200">
              <Calendar className="text-chart-4 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-foreground text-[10px] font-bold tabular-nums">
                  {new Date(registry.stats.latestUpdate).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                    },
                  )}
                </span>
                <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">
                  Updated
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Languages Tags */}
        {registry.stats.languages.length > 0 && (
          <div className="border-border/50 mt-4 flex flex-wrap gap-2 border-t pt-4">
            {registry.stats.languages.slice(0, 3).map(lang => (
              <span
                className="bg-accent/20 text-accent-foreground border-accent/30 rounded-full border px-2.5 py-1 text-[10px] font-medium"
                key={lang}
              >
                {lang}
              </span>
            ))}
            {registry.stats.languages.length > 3 && (
              <span className="bg-muted/50 text-muted-foreground rounded-full px-2.5 py-1 text-[10px] font-medium">
                +{registry.stats.languages.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line on hover */}
      <div className="from-primary/50 via-accent/50 to-primary/50 absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover/card:w-full" />
    </Link>
  )
}
