import { useMemo, useState } from 'react'

import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'

export interface SidebarFilterItem {
  count: number
  label: string
  value: string
}

interface SidebarFilterSectionProps {
  allCount?: number
  basePath?: string
  items: SidebarFilterItem[]
  maxHeight?: string
  paramKey: string
  searchPlaceholder?: string
  selectedValue?: string
  title: string
}

export function SidebarFilterSection({
  title,
  items,
  selectedValue,
  searchPlaceholder = 'Search...',
  maxHeight = 'max-h-48',
  paramKey,
  basePath = '/browse',
  allCount,
}: SidebarFilterSectionProps) {
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const searchLower = search.toLowerCase()
    return items.filter(item => item.label.toLowerCase().includes(searchLower))
  }, [items, search])

  if (items.length === 0) return null

  // Calculate total count for "All" option
  const totalCount =
    allCount ?? items.reduce((sum, item) => sum + item.count, 0)

  return (
    <div>
      <h3 className="font-display mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>

      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
        <input
          className="w-full rounded-lg border border-border/30 bg-muted/30 py-1.5 pr-2.5 pl-8 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          onChange={e => {
            setSearch(e.target.value)
          }}
          placeholder={searchPlaceholder}
          type="text"
          value={search}
        />
      </div>

      {/* Scrollable list */}
      <nav className={`space-y-0.5 overflow-y-auto ${maxHeight}`}>
        {/* "All" option to clear filter */}
        <Link
          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            !selectedValue
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
          search={prev => clearFilterParam(prev, paramKey)}
          to={basePath}
        >
          <span className="truncate">All</span>
          <span className="text-xs text-muted-foreground/50">{totalCount}</span>
        </Link>

        {/* Divider */}
        <div className="my-1 border-t border-border/30" />

        {filteredItems.map(item => (
          <Link
            className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              selectedValue === item.value
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            key={item.value}
            search={prev => ({
              ...prev,
              [paramKey]: item.value,
            })}
            to={basePath}
          >
            <span className="truncate">{item.label}</span>
            <span className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground/50">
                {item.count}
              </span>
            </span>
          </Link>
        ))}
        {filteredItems.length === 0 && search && (
          <span className="block px-2.5 py-1.5 text-xs text-muted-foreground">
            No results
          </span>
        )}
      </nav>
    </div>
  )
}

// Helper to clear a specific filter param from search
function clearFilterParam(
  prev: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: _, ...rest } = prev
  return rest
}
