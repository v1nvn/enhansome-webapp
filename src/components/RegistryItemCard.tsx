import {
  Archive,
  Calendar,
  ExternalLink,
  GitBranch,
  Star,
} from 'lucide-react'
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
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-cyan-400">{registry}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{section}</span>
          </div>
        </div>
        {item.repo_info?.archived && (
          <Archive className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Repo Info */}
      {item.repo_info && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3 h-3" />
                {item.repo_info.stars.toLocaleString()}
              </span>
              {item.repo_info.language && (
                <span className="flex items-center gap-1 text-gray-400">
                  <GitBranch className="w-3 h-3" />
                  {item.repo_info.language}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {new Date(item.repo_info.last_commit).toLocaleDateString()}
            </span>
            <a
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
