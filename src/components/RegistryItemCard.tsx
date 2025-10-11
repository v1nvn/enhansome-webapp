import { Archive, Calendar, ExternalLink, GitBranch, Star } from 'lucide-react'

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
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">
            {item.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-cyan-400">{registry}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{section}</span>
          </div>
        </div>
        {item.repo_info?.archived && (
          <Archive className="ml-2 h-4 w-4 flex-shrink-0 text-orange-400" />
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="mb-4 line-clamp-2 text-sm text-gray-400">
          {item.description}
        </p>
      )}

      {/* Repo Info */}
      {item.repo_info && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="h-3 w-3" />
                {item.repo_info.stars.toLocaleString()}
              </span>
              {item.repo_info.language && (
                <span className="flex items-center gap-1 text-gray-400">
                  <GitBranch className="h-3 w-3" />
                  {item.repo_info.language}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {new Date(item.repo_info.last_commit).toLocaleDateString()}
            </span>
            <a
              className="flex items-center gap-1 text-xs text-cyan-400 transition-colors hover:text-cyan-300"
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              View
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
