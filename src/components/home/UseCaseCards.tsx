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
        <div className="from-primary/20 to-accent/20 text-primary flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-xs">
          ◇
        </div>
        <h2 className="font-display text-foreground text-xl font-semibold">
          Start with a category
        </h2>
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
        <style>{`.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
        {categories.map(category => (
          <button
            className="bg-card duration-250 group relative flex w-[220px] shrink-0 overflow-hidden rounded-xl p-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl"
            key={category.name}
            onClick={() => {
              onCategoryClick(category.name)
            }}
            type="button"
          >
            {/* Subtle gradient on hover */}
            <div className="from-primary/0 via-primary/5 to-primary/0 duration-250 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative flex flex-col gap-2">
              <h3 className="text-foreground group-hover:text-primary font-display font-semibold transition-colors">
                {category.name}
              </h3>
              <div className="text-muted-foreground text-xs">
                {category.count.toLocaleString()} libraries
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
