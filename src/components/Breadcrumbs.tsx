import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  href?: string
  label: string
  search?: Record<string, string | undefined>
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        to="/browse"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Browse</span>
      </Link>

      {items.map(item => (
        <div className="flex items-center gap-1" key={item.label}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {item.href || item.search ? (
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              search={item.search}
              to={item.href ?? '/browse'}
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
