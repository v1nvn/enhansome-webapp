import { Link } from '@tanstack/react-router'
import { ArrowRight, Code, Layers } from 'lucide-react'

interface QuickFilterPillsProps {
  languages?: string[]
}

const commonLanguages = [
  {
    name: 'JavaScript',
    icon: 'JS',
    color:
      'from-yellow-400/20 to-amber-500/20 border-yellow-400/30 text-yellow-700 dark:text-yellow-300 hover:from-yellow-400/30 hover:to-amber-500/30',
  },
  {
    name: 'TypeScript',
    icon: 'TS',
    color:
      'from-blue-400/20 to-blue-600/20 border-blue-400/30 text-blue-700 dark:text-blue-300 hover:from-blue-400/30 hover:to-blue-600/30',
  },
  {
    name: 'Python',
    icon: 'Py',
    color:
      'from-emerald-400/20 to-green-500/20 border-emerald-400/30 text-emerald-700 dark:text-emerald-300 hover:from-emerald-400/30 hover:to-green-500/30',
  },
  {
    name: 'Rust',
    icon: 'Rs',
    color:
      'from-orange-400/20 to-red-500/20 border-orange-400/30 text-orange-700 dark:text-orange-300 hover:from-orange-400/30 hover:to-red-500/30',
  },
  {
    name: 'Go',
    icon: 'Go',
    color:
      'from-cyan-400/20 to-teal-500/20 border-cyan-400/30 text-cyan-700 dark:text-cyan-300 hover:from-cyan-400/30 hover:to-teal-500/30',
  },
]

const commonCategories = [
  { name: 'Web Dev', filter: 'web-development', icon: '🌐' },
  { name: 'DevOps', filter: 'devops', icon: '⚙️' },
  { name: 'ML/AI', filter: 'machine-learning', icon: '🧠' },
  { name: 'Mobile', filter: 'mobile', icon: '📱' },
]

export function QuickFilterPills({ languages }: QuickFilterPillsProps) {
  // Use provided languages or fall back to common ones
  const languagePills =
    languages && languages.length > 0
      ? commonLanguages.filter(l => languages.includes(l.name))
      : commonLanguages

  return (
    <section className="border-border/50 from-muted/20 to-muted/10 border-b bg-gradient-to-b">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-foreground text-xl font-bold">
              Explore by Topic
            </h3>
            <p className="text-muted-foreground/70 mt-1 text-sm">
              Jump directly to what interests you
            </p>
          </div>
          <Link
            className="group/browse text-muted-foreground hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-colors"
            to="/registries"
          >
            <span>Browse all</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/browse:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex flex-col gap-8">
          {/* Language Pills with icon badges */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-md">
                <Code className="h-3.5 w-3.5" />
              </div>
              <p className="text-foreground text-sm font-semibold uppercase tracking-wide">
                Languages
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {languagePills.map(lang => (
                <Link
                  className={`group/link relative inline-flex items-center gap-2.5 rounded-full border bg-gradient-to-br px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${lang.color}`}
                  key={lang.name}
                  search={{ lang: lang.name }}
                  to="/registry"
                >
                  {/* Language icon badge */}
                  <span className="bg-current/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
                    {lang.icon}
                  </span>
                  <span>{lang.name}</span>
                  {/* Arrow on hover */}
                  <ArrowRight className="ml-1 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover/link:translate-x-0.5 group-hover/link:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Category Pills with emoji icons */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-accent/50 text-accent-foreground flex h-6 w-6 items-center justify-center rounded-md">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <p className="text-foreground text-sm font-semibold uppercase tracking-wide">
                Categories
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {commonCategories.map(cat => (
                <Link
                  className="group/category border-border/60 bg-card text-foreground hover:border-primary/30 hover:bg-primary/5 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  key={cat.name}
                  search={{ q: cat.filter }}
                  to="/registry"
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.name}</span>
                  <ArrowRight className="text-primary ml-1 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover/category:translate-x-0.5 group-hover/category:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
