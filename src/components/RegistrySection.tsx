import { useState } from 'react'

import { ChevronDown, ChevronRight } from 'lucide-react'

import type { RegistryItem } from '@/types/registry'

import { RegistryItemTree } from './RegistryItemTree'

interface RegistrySectionProps {
  description: null | string
  expandAll?: boolean
  initialExpanded?: boolean
  items: RegistryItem[]
  registry: string
  title: string
}

export function RegistrySection({
  description,
  expandAll,
  initialExpanded = true,
  items,
  registry,
  title,
}: RegistrySectionProps) {
  const [localExpanded, setLocalExpanded] = useState(initialExpanded)
  const isExpanded = expandAll !== undefined ? expandAll : localExpanded

  if (items.length === 0) {
    return null // Don't render empty sections
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-600 bg-slate-800/40 shadow-lg backdrop-blur-sm">
      {/* Section Header */}
      <button
        className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-slate-700/50 bg-slate-800/95 px-6 py-5 backdrop-blur-md transition-all duration-200 hover:bg-slate-700/40"
        onClick={() => {
          setLocalExpanded(!isExpanded)
        }}
        type="button"
      >
        <div className="flex flex-1 items-center gap-4 text-left">
          {isExpanded ? (
            <ChevronDown className="h-6 w-6 flex-shrink-0 text-cyan-400" />
          ) : (
            <ChevronRight className="h-6 w-6 flex-shrink-0 text-gray-400" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-2xl font-bold text-white">{title}</h3>
            {description && (
              <p className="line-clamp-1 text-sm text-gray-300">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-medium text-cyan-300">
            {items.length}
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <RegistryItemTree
                item={item}
                // eslint-disable-next-line @eslint-react/no-array-index-key
                key={`${item.title}-${index}`}
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
