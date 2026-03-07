import { Link } from '@tanstack/react-router'
import { Hash } from 'lucide-react'

interface TrendingTagsProps {
  limit?: number
  tags: { count: number; name: string; slug: string }[]
}

export function TrendingTags({ tags, limit = 20 }: TrendingTagsProps) {
  const displayTags = tags.slice(0, limit)

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-primary">
          <Hash className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Trending Tags
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayTags.map(tag => (
          <Link
            className="rounded-full bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-primary/15 hover:text-primary hover:shadow-md"
            key={tag.slug}
            search={{ tag: tag.slug }}
            to="/browse"
          >
            {tag.name}
          </Link>
        ))}
        <Link
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          search={{}}
          to="/browse"
        >
          more →
        </Link>
      </div>
    </section>
  )
}
