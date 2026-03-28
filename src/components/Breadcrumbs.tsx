import { Link } from '@tanstack/react-router'
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react'

export interface BreadcrumbItem {
  href?: string
  label: string
  search?: Record<string, string | undefined>
}

interface BreadcrumbsProps {
  /** Home link href. @default "/browse" */
  homeHref?: string
  /** Home label for screen reader. @default "Browse" */
  homeLabel?: string
  items: BreadcrumbItem[]
  /** Maximum items before collapsing. @default undefined (no collapse) */
  maxItems?: number
  /** Show home link at the start. @default true */
  showHome?: boolean
}

export function Breadcrumbs({
  items,
  showHome = true,
  maxItems,
  homeHref = '/browse',
  homeLabel = 'Browse',
}: BreadcrumbsProps) {
  // Handle collapse for long paths
  const displayItems =
    maxItems && items.length > maxItems
      ? [
          ...items.slice(0, 2), // Keep first 2 items
          { label: '…' }, // Ellipsis indicator
          ...items.slice(-1), // Keep last item
        ]
      : items

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {showHome && (
        <Link
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          to={homeHref}
        >
          <Home className="h-4 w-4" />
          <span className="sr-only">{homeLabel}</span>
        </Link>
      )}

      {displayItems.map((item, index) => {
        const isEllipsis = item.label === '…'
        const showHomeChevron = showHome && index === 0
        const chevronKey = `${item.label}-${index}`

        return (
          <div className="flex items-center gap-1" key={chevronKey}>
            {(showHomeChevron || index > 0) && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            )}
            {isEllipsis ? (
              <span aria-hidden="true" className="text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : item.href || item.search ? (
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                search={item.search}
                to={item.href ?? homeHref}
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
