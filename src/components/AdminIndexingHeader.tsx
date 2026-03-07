import { Shield } from 'lucide-react'

export function AdminIndexingHeader() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] translate-x-1/4 -translate-y-1/4 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
            <Shield className="h-4 w-4" />
            <span>Admin Tools</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display mb-4 text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Registry Indexing
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg leading-relaxed text-muted-foreground">
            Manually trigger registry indexing and view progress tracking and
            history.
          </p>
        </div>
      </div>
    </section>
  )
}
