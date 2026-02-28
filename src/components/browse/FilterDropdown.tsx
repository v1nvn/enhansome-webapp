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
        className="bg-card hover:bg-muted/20 border-border/30 flex items-center gap-2 rounded-xl border-2 px-4 py-3 pr-3 text-sm font-medium shadow-sm transition-all"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        type="button"
      >
        <Icon className="text-muted-foreground h-4 w-4" />
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            className={`bg-card border-border/30 shadow-foreground/5 absolute right-0 top-full z-20 mt-2 ${widthClass} rounded-2xl border shadow-xl`}
          >
            {/* Search */}
            <div className="border-border/30 border-b p-3">
              <div className="relative">
                <Search className="text-muted-foreground/50 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input
                  className="bg-muted/30 focus:ring-primary/20 w-full rounded-xl border-0 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
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
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  handleSelect(undefined)
                }}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span>{allLabel}</span>
                  <span className="text-muted-foreground/50 text-xs">
                    {totalCount.toLocaleString()}
                  </span>
                </div>
              </button>
              {visibleItems.map(item => (
                <button
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedValue === item.value
                      ? 'bg-primary/10 text-primary font-medium'
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
                    <span className="text-muted-foreground/50 text-xs">
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
