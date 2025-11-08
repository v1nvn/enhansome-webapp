import { Archive, Calendar, ExternalLink, Star, X } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

interface ItemDetailPanelProps {
  item: null | RegistryItem
  onClose: () => void
}

export function ItemDetailPanel({ item, onClose }: ItemDetailPanelProps) {
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100/30 text-slate-500 dark:bg-slate-900/30 dark:text-gray-500">
        <p>Select an item to view details</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const renderItemTree = (treeItem: RegistryItem, level = 0) => (
    <div className={level > 0 ? 'ml-4 mt-2' : 'mt-2'} key={treeItem.title}>
      <div className="rounded-lg border border-slate-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <h4 className="mb-1 font-medium text-slate-900 dark:text-white">{treeItem.title}</h4>
        {treeItem.description && (
          <p className="mb-2 text-sm text-slate-600 dark:text-gray-400">{treeItem.description}</p>
        )}
        {treeItem.repo_info && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {treeItem.repo_info.stars.toLocaleString()}
            </div>
            {treeItem.repo_info.language && (
              <span className="rounded bg-slate-200 px-2 py-0.5 dark:bg-slate-700">
                {treeItem.repo_info.language}
              </span>
            )}
          </div>
        )}
      </div>
      {treeItem.children.length > 0 && (
        <div className="mt-2">
          {treeItem.children.map(child => renderItemTree(child, level + 1))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white/30 dark:border-slate-700 dark:bg-slate-800/30">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{item.title}</h2>
          {item.repo_info && (
            <a
              className="flex items-center gap-1 text-sm text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300"
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {item.repo_info.owner}/{item.repo_info.repo}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          className="rounded-lg p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5 text-slate-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Description */}
        {item.description && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
              Description
            </h3>
            <p className="text-slate-600 dark:text-gray-400">{item.description}</p>
          </div>
        )}

        {/* Stats */}
        {item.repo_info && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
              Repository Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/50 p-3 dark:bg-slate-800/50">
                <div className="mb-1 flex items-center gap-2 text-slate-600 dark:text-gray-400">
                  <Star className="h-4 w-4" />
                  <span className="text-xs">Stars</span>
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {item.repo_info.stars.toLocaleString()}
                </p>
              </div>

              {item.repo_info.language && (
                <div className="rounded-lg bg-white/50 p-3 dark:bg-slate-800/50">
                  <div className="mb-1 text-xs text-slate-600 dark:text-gray-400">Language</div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {item.repo_info.language}
                  </p>
                </div>
              )}

              {item.repo_info.last_commit && (
                <div className="col-span-2 rounded-lg bg-white/50 p-3 dark:bg-slate-800/50">
                  <div className="mb-1 flex items-center gap-2 text-slate-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Last Commit</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {formatDate(item.repo_info.last_commit)}
                  </p>
                </div>
              )}

              {item.repo_info.archived && (
                <div className="col-span-2 rounded-lg border border-orange-500/30 bg-orange-500/20 p-3">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-300">
                    <Archive className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      Archived Repository
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {item.children.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-gray-300">
              Sub-items ({item.children.length})
            </h3>
            <div className="space-y-2">
              {item.children.map(child => renderItemTree(child))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
