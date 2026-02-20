import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Database,
  FlaskConical,
  Globe,
  Lock,
  Smartphone,
  Wrench,
} from 'lucide-react'

import type { UseCaseCategoryWithData } from '@/lib/server-functions'
import type { UseCaseCategoryWithCount } from '@/lib/use-case-categories'

type CategoryProp = UseCaseCategoryWithCount | UseCaseCategoryWithData

// Icon mapping for use case categories
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  animation: () => null, // Sparkles is imported separately
  'api-clients': Globe,
  authentication: Lock,
  'build-tools': Wrench,
  'charts-visualization': BarChart3,
  database: Database,
  'date-time': () => null, // Calendar
  forms: () => null, // FileInput
  'mobile-development': Smartphone,
  'state-management': Database,
  testing: FlaskConical,
  'ui-components': () => null, // Layout
}

interface UseCaseCardsProps {
  categories: CategoryProp[]
}

export function UseCaseCards({ categories }: UseCaseCardsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-sm text-xs">
          ◇
        </div>
        <h2 className="font-display text-foreground text-xl font-semibold">
          Discover by Purpose
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => (
          <Link
            className="border-border hover:border-primary/50 bg-card group rounded-sm border p-4 transition-all hover:shadow-md"
            key={category.id}
            params={{ categoryId: category.id }}
            to="/category/$categoryId"
          >
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-sm">
                {renderIcon(category.icon)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-foreground group-hover:text-primary font-display font-semibold transition-colors">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                  {category.description}
                </p>
                <div className="text-muted-foreground mt-2 text-xs">
                  {category.count} libraries
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function renderIcon(iconName: string) {
  if (iconName in ICON_MAP) {
    const IconComponent = ICON_MAP[iconName]
    return <IconComponent className="h-5 w-5" />
  }

  // Fallback icons for unmapped entries
  switch (iconName) {
    case 'calendar':
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      )
    case 'file-input':
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      )
    case 'layout':
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
          <line x1="3" x2="21" y1="9" y2="9" />
          <line x1="9" x2="9" y1="9" y2="21" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      )
    default:
      return (
        <div className="text-primary font-mono text-xs font-semibold">
          {iconName.slice(0, 2).toUpperCase()}
        </div>
      )
  }
}
