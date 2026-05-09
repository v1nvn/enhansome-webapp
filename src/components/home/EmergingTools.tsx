import { Link } from '@tanstack/react-router'
import { Sparkles, Star } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface EmergingToolsProps {
  repos: (RegistryItem & {
    categories: string[]
    id: number
    qualityScore: number
    registries: string[]
    tags: string[]
  })[]
}

export function EmergingTools({ repos }: EmergingToolsProps) {
  if (repos.length < 4) return null

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-xs text-purple-600 dark:text-purple-400">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Emerging Tools
        </h2>
        <span className="text-xs text-muted-foreground">Fresh & rising</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {repos.map(repo => (
          <Link
            className="group rounded-xl border-l-2 border-l-primary/30 bg-gradient-to-r from-primary/[0.03] to-transparent p-4 transition-all duration-250 hover:-translate-y-0.5 hover:shadow-lg"
            key={repo.id}
            params={{
              owner: repo.repo_info?.owner ?? '',
              name: repo.repo_info?.repo ?? '',
            }}
            to="/repo/$owner/$name"
          >
            <h3 className="font-display text-sm leading-tight font-semibold text-foreground transition-colors group-hover:text-primary">
              {repo.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {repo.description}
            </p>
            <div className="mt-3 flex items-center gap-2.5 text-xs text-muted-foreground">
              {repo.repo_info?.language && (
                <span className="rounded-md bg-muted/40 px-1.5 py-0.5 font-medium">
                  {repo.repo_info.language}
                </span>
              )}
              {repo.repo_info?.stars !== undefined && (
                <div className="flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  {repo.repo_info.stars.toLocaleString()}
                </div>
              )}
              {repo.repo_info?.last_commit && (
                <span className="text-muted-foreground/70">
                  {formatDate(repo.repo_info.last_commit)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function formatDate(dateStr: string) {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
