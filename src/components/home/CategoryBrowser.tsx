import { Link } from '@tanstack/react-router'
import { Folder } from 'lucide-react'

interface CategoryBrowserProps {
  categories: { count: number; name: string }[]
  limit?: number
}

export function CategoryBrowser({
  categories,
  limit = 20,
}: CategoryBrowserProps) {
  const displayCategories = categories.slice(0, limit)

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-primary">
          <Folder className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Browse by Category
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {displayCategories.map(category => (
          <Link
            className="group flex items-center justify-between rounded-lg bg-card px-4 py-3 shadow-sm transition-all hover:bg-primary/5 hover:shadow-md"
            key={category.name}
            search={{ cat: category.name }}
            to="/browse"
          >
            <span className="font-medium text-foreground transition-colors group-hover:text-primary">
              {category.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {category.count.toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
      {categories.length > limit && (
        <Link
          className="inline-block text-sm font-medium text-primary hover:underline"
          search={{}}
          to="/browse"
        >
          View all {categories.length} categories →
        </Link>
      )}
    </section>
  )
}
