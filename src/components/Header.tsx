import { Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            className="group flex items-center gap-3 transition-transform hover:scale-105"
            to="/"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
              <BookOpen className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-2xl leading-tight font-bold tracking-tight text-foreground">
                Enhansome
              </h1>
              <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                Registry
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              to="/browse"
            >
              Browse
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
