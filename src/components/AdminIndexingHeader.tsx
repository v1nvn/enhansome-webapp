import { Shield } from 'lucide-react'

export function AdminIndexingHeader() {
  return (
    <section className="border-border relative overflow-hidden border-b">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="bg-accent absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full blur-3xl" />
        <div className="bg-primary/20 absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="border-border bg-card text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm">
            <Shield className="h-4 w-4" />
            <span>Admin Tools</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-foreground mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Registry Indexing
          </h1>

          {/* Subtitle */}
          <p className="font-body text-muted-foreground text-lg leading-relaxed">
            Manually trigger registry indexing and view progress tracking and
            history.
          </p>
        </div>
      </div>
    </section>
  )
}
