import { Link } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'

const POPULAR_FRAMEWORKS = [
  { name: 'React', lang: 'TypeScript' },
  { name: 'Vue', lang: 'TypeScript' },
  { name: 'Python', lang: 'Python' },
  { name: 'Go', lang: 'Go' },
  { name: 'Rust', lang: 'Rust' },
  { name: 'Next.js', lang: 'TypeScript' },
]

interface FrameworkPillsProps {
  limit?: number
}

export function FrameworkPills({ limit = 6 }: FrameworkPillsProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Trending Frameworks
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {POPULAR_FRAMEWORKS.slice(0, limit).map(framework => (
          <Link
            className="rounded-full bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-primary/15 hover:text-primary hover:shadow-md"
            key={framework.name}
            search={{ q: framework.name, lang: framework.lang }}
            to="/browse"
          >
            {framework.name}
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
