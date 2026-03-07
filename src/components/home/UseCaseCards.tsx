interface UseCaseCardsProps {
  categories: { count: number; name: string }[]
  onCategoryClick: (categoryName: string) => void
}

export function UseCaseCards({
  categories,
  onCategoryClick,
}: UseCaseCardsProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-primary">
          ◇
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Start with a category
        </h2>
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
        <style>{`.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
        {categories.map(category => (
          <button
            className="group relative flex w-[220px] shrink-0 overflow-hidden rounded-xl bg-card p-5 text-left shadow-md transition-all duration-250 hover:-translate-y-0.5 hover:shadow-xl"
            key={category.name}
            onClick={() => {
              onCategoryClick(category.name)
            }}
            type="button"
          >
            {/* Subtle gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-250 group-hover:opacity-100" />

            <div className="relative flex flex-col gap-2">
              <h3 className="font-display font-semibold text-foreground transition-colors group-hover:text-primary">
                {category.name}
              </h3>
              <div className="text-xs text-muted-foreground">
                {category.count.toLocaleString()} libraries
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
