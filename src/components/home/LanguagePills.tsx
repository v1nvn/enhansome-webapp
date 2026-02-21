import { Link } from '@tanstack/react-router'

const POPULAR_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'Ruby',
  'PHP',
  'Swift',
]

export function LanguagePills() {
  return (
    <section className="space-y-5">
      <h2 className="font-display text-foreground text-xl font-semibold">
        Explore by Language
      </h2>
      <div className="flex flex-wrap gap-2">
        {POPULAR_LANGUAGES.map(lang => (
          <Link
            className="bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow-md"
            key={lang}
            search={{ lang }}
            to="/registry"
          >
            {lang}
          </Link>
        ))}
      </div>
    </section>
  )
}
