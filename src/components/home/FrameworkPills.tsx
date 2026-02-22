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
          <div className="from-primary/20 to-accent/20 rounded-lg bg-gradient-to-br p-1.5">
            <TrendingUp className="text-primary h-4 w-4" />
          </div>
          <h2 className="font-display text-foreground text-xl font-semibold">
            Trending Frameworks
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {POPULAR_FRAMEWORKS.slice(0, limit).map(framework => (
          <Link
            className="bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow-md"
            key={framework.name}
            search={{ q: framework.name, lang: framework.lang }}
            to="/browse"
          >
            {framework.name}
          </Link>
        ))}
        <Link
          className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-medium transition-all"
          search={{}}
          to="/browse"
        >
          more →
        </Link>
      </div>
    </section>
  )
}
