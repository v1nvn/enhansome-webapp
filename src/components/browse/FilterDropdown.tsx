import { useMemo, useState } from 'react'

import { ChevronDown, Search } from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export interface FilterDropdownItem {
  count: number
  label: string
  value: string
}

interface FilterDropdownProps {
  allLabel: string
  icon: LucideIcon
  items: FilterDropdownItem[]
  onSelect: (value: string | undefined) => void
  searchPlaceholder: string
  selectedValue?: string
  widthClass?: string
}

export function FilterDropdown({
  allLabel,
  icon: Icon,
  items,
  onSelect,
  searchPlaceholder,
  selectedValue,
  widthClass = 'w-72',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const visibleItems = useMemo(() => {
    const filtered = search.trim()
      ? items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase()),
        )
      : items
    return filtered.filter(item => item.count > 0)
  }, [items, search])

  const selectedItem = items.find(item => item.value === selectedValue)
  const displayLabel = selectedItem ? selectedItem.label : allLabel

  const totalCount = items.reduce((sum, item) => sum + item.count, 0)

  const handleSelect = (value: string | undefined) => {
    onSelect(value)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-xl border-2 border-border/30 bg-card px-4 py-3 pr-3 text-sm font-medium shadow-sm transition-all hover:bg-muted/20"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        type="button"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <button
            aria-label={`Close ${allLabel} dropdown`}
            className="fixed inset-0 z-10 cursor-pointer"
            onClick={() => {
              setIsOpen(false)
            }}
            type="button"
          />
          <div
            className={`absolute top-full right-0 z-20 mt-2 border-border/30 bg-card shadow-foreground/5 ${widthClass} rounded-2xl border shadow-xl`}
          >
            {/* Search */}
            <div className="border-b border-border/30 p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  className="w-full rounded-xl border-0 bg-muted/30 py-2 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  onChange={e => {
                    setSearch(e.target.value)
                  }}
                  placeholder={searchPlaceholder}
                  type="text"
                  value={search}
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto p-2">
              <button
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  !selectedValue
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  handleSelect(undefined)
                }}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span>{allLabel}</span>
                  <span className="text-xs text-muted-foreground/50">
                    {totalCount.toLocaleString()}
                  </span>
                </div>
              </button>
              {visibleItems.map(item => (
                <button
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedValue === item.value
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted/30'
                  }`}
                  key={item.value}
                  onClick={() => {
                    handleSelect(item.value)
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    <span className="text-xs text-muted-foreground/50">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
