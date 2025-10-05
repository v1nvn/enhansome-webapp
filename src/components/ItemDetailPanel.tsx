import { Archive, Calendar, ExternalLink, Star, X } from 'lucide-react'
import type { RegistryItem } from '@/types/registry'

interface ItemDetailPanelProps {
  item: RegistryItem | null
  onClose: () => void
}

export function ItemDetailPanel({ item, onClose }: ItemDetailPanelProps) {
  if (!item) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/30 text-gray-500">
        <p>Select an item to view details</p>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderItemTree = (treeItem: RegistryItem, level = 0) => (
    <div key={treeItem.title} className={level > 0 ? 'ml-4 mt-2' : 'mt-2'}>
      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <h4 className="text-white font-medium mb-1">{treeItem.title}</h4>
        {treeItem.description && (
          <p className="text-sm text-gray-400 mb-2">{treeItem.description}</p>
        )}
        {treeItem.repo_info && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {treeItem.repo_info.stars.toLocaleString()}
            </div>
            {treeItem.repo_info.language && (
              <span className="px-2 py-0.5 bg-slate-700 rounded">
                {treeItem.repo_info.language}
              </span>
            )}
          </div>
        )}
      </div>
      {treeItem.children && treeItem.children.length > 0 && (
        <div className="mt-2">
          {treeItem.children.map((child) => renderItemTree(child, level + 1))}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-slate-800/30 border-l border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white mb-1">{item.title}</h2>
          {item.repo_info && (
            <a
              href={`https://github.com/${item.repo_info.owner}/${item.repo_info.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {item.repo_info.owner}/{item.repo_info.repo}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Description */}
        {item.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Description
            </h3>
            <p className="text-gray-400">{item.description}</p>
          </div>
        )}

        {/* Stats */}
        {item.repo_info && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Repository Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-xs">Stars</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {item.repo_info.stars.toLocaleString()}
                </p>
              </div>

              {item.repo_info.language && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Language</div>
                  <p className="text-lg font-semibold text-white">
                    {item.repo_info.language}
                  </p>
                </div>
              )}

              {item.repo_info.last_commit && (
                <div className="p-3 bg-slate-800/50 rounded-lg col-span-2">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Last Commit</span>
                  </div>
                  <p className="text-sm text-white">
                    {formatDate(item.repo_info.last_commit)}
                  </p>
                </div>
              )}

              {item.repo_info.archived && (
                <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg col-span-2">
                  <div className="flex items-center gap-2 text-orange-300">
                    <Archive className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      Archived Repository
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Children */}
        {item.children && item.children.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Sub-items ({item.children.length})
            </h3>
            <div className="space-y-2">
              {item.children.map((child) => renderItemTree(child))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
