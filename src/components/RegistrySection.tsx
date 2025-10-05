import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { RegistryItem } from '@/types/registry'
import { RegistryItemTree } from './RegistryItemTree'

interface RegistrySectionProps {
  title: string
  description: string | null
  items: RegistryItem[]
  registry: string
  initialExpanded?: boolean
  expandAll?: boolean
}

export function RegistrySection({
  title,
  description,
  items,
  registry,
  initialExpanded = true,
  expandAll,
}: RegistrySectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  // Sync with expandAll prop when it changes
  useEffect(() => {
    if (expandAll !== undefined) {
      setIsExpanded(expandAll)
    }
  }, [expandAll])

  if (items.length === 0) {
    return null // Don't render empty sections
  }

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden shadow-lg">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-700/40 transition-all duration-200 border-b border-slate-700/50 sticky top-0 z-30 bg-slate-800/95 backdrop-blur-md"
      >
        <div className="flex items-center gap-4 flex-1 text-left">
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-cyan-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-white mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-gray-300 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm font-medium rounded-full">
            {items.length}
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <RegistryItemTree
                key={`${item.title}-${index}`}
                item={item}
                registry={registry}
                section={title}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
