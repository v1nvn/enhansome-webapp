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
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-400 ml-4">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
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
