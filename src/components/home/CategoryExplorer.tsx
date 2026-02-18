import { Link } from '@tanstack/react-router'
import { ArrowRight, Layers } from 'lucide-react'

import type { CategorySummary } from '@/lib/server-functions'

interface CategoryCardProps {
  category: CategorySummary
  index: number
}

interface CategoryExplorerProps {
  categories: CategorySummary[]
  maxCategories?: number
}

// Category icons mapping based on keywords
const getCategoryIcon = (category: string): { color: string; icon: string } => {
  const lower = category.toLowerCase()

  if (
    lower.includes('web') ||
    lower.includes('frontend') ||
    lower.includes('ui')
  ) {
    return {
      icon: '🌐',
      color:
        'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
    }
  }
  if (
    lower.includes('backend') ||
    lower.includes('api') ||
    lower.includes('server')
  ) {
    return {
      icon: '⚡',
      color:
        'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    }
  }
  if (
    lower.includes('devops') ||
    lower.includes('docker') ||
    lower.includes('kubernetes')
  ) {
    return {
      icon: '🔧',
      color:
        'from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30',
    }
  }
  if (
    lower.includes('ml') ||
    lower.includes('ai') ||
    lower.includes('data') ||
    lower.includes('python')
  ) {
    return {
      icon: '🧠',
      color:
        'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
    }
  }
  if (
    lower.includes('mobile') ||
    lower.includes('ios') ||
    lower.includes('android')
  ) {
    return {
      icon: '📱',
      color:
        'from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30',
    }
  }
  if (lower.includes('security') || lower.includes('auth')) {
    return {
      icon: '🔒',
      color: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
    }
  }
  if (lower.includes('database') || lower.includes('storage')) {
    return {
      icon: '🗄️',
      color:
        'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30',
    }
  }
  if (lower.includes('test') || lower.includes('quality')) {
    return {
      icon: '✅',
      color:
        'from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30',
    }
  }
  if (lower.includes('tool') || lower.includes('util')) {
    return {
      icon: '🛠️',
      color:
        'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
    }
  }

  return {
    icon: '📦',
    color:
      'from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30',
  }
}

export function CategoryExplorer({
  categories,
  maxCategories = 10,
}: CategoryExplorerProps) {
  if (categories.length === 0) {
    return null
  }

  // Take top categories by count
  const topCategories = categories.slice(0, maxCategories)

  return (
    <section className="border-border/50 from-card to-muted/30 relative overflow-hidden border-b bg-gradient-to-b">
      {/* Background decoration */}
      <div className="pointer-events-none absolute right-0 top-1/4 -translate-y-1/2 translate-x-1/3 opacity-[0.02]">
        <Layers className="h-96 w-96" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-border/50 h-px flex-1" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
              Discover
            </span>
            <div className="bg-border/50 h-px flex-1" />
          </div>
          <h2 className="font-display text-foreground text-center text-3xl font-bold md:text-4xl lg:text-5xl">
            Browse by Category
          </h2>
          <p className="text-muted-foreground/80 mx-auto mt-4 max-w-xl text-center text-lg">
            Explore {categories.length.toLocaleString()} curated categories
            organized for modern development
          </p>
        </div>

        {/* Category Grid with masonry-style feel */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {topCategories.map((category, idx) => (
            <CategoryCard
              category={category}
              index={idx}
              key={category.category}
            />
          ))}
        </div>

        {/* Browse All Link */}
        <div className="mt-12 flex justify-center">
          <Link
            className="group/explore border-border/60 bg-card/80 text-foreground hover:border-primary/30 hover:bg-primary/5 inline-flex items-center gap-3 rounded-full border px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            to="/registry"
          >
            <span>Browse all categories</span>
            <span className="text-muted-foreground/60">
              ({categories.length})
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/explore:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function CategoryCard({ category, index }: CategoryCardProps) {
  const { icon, color } = getCategoryIcon(category.category)
  const animationDelay = `${index * 50}ms`

  return (
    <Link
      className="group/cat border-border/60 bg-card/80 hover:shadow-primary/5 hover:border-primary/20 relative overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      search={{ q: category.category }}
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay,
        opacity: 0,
      }}
      to="/registry"
    >
      {/* Gradient background on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover/cat:opacity-100`}
      />

      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="from-primary/10 to-primary/5 text-primary group-hover/cat:from-primary/20 group-hover/cat:to-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl transition-all duration-300 group-hover/cat:rotate-3 group-hover/cat:scale-110">
            {icon}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground group-hover/cat:text-primary truncate text-base font-bold transition-colors duration-200">
              {category.category}
            </h3>
            <p className="text-muted-foreground/70 mt-1 text-sm">
              {category.count.toLocaleString()}{' '}
              <span className="text-xs">
                {category.count === 1 ? 'item' : 'items'}
              </span>
            </p>
          </div>

          {/* Arrow indicator */}
          <div className="text-muted-foreground/30 group-hover/cat:text-primary/70 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 group-hover/cat:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="from-primary/50 to-accent/50 absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover/cat:w-full" />
    </Link>
  )
}
