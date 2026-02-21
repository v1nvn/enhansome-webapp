import { Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3">
          <Link
            className="group flex items-center gap-3 transition-transform hover:scale-105"
            to="/"
          >
            <div className="from-primary to-primary/80 text-primary-foreground group-hover:shadow-primary/20 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-all group-hover:shadow-lg">
              <BookOpen className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-foreground text-2xl font-bold leading-tight tracking-tight">
                Enhansome
              </h1>
              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
                Registry
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
