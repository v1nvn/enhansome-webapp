import { useState } from 'react'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { RichItemCard } from '@/components/RichItemCard'
import {
  useCaseCategoriesQueryOptions,
  useCaseItemsQueryOptions,
} from '@/lib/server-functions'
import { FRAMEWORK_OPTIONS } from '@/lib/use-case-categories'

export const Route = createFileRoute('/category/$categoryId')({
  component: CategoryPage,

  loader: ({ context, params }) => {
    /* eslint-disable react-hooks/rules-of-hooks */
    void context.queryClient.ensureQueryData(useCaseCategoriesQueryOptions())

    void context.queryClient.ensureQueryData(
      useCaseItemsQueryOptions({ categoryId: params.categoryId }),
    )
    /* eslint-enable react-hooks/rules-of-hooks */
  },
})

function CategoryPage() {
  const { categoryId } = Route.useParams()
  const [framework, setFramework] = useState<string>('all')

  const { data: categories } = useSuspenseQuery(useCaseCategoriesQueryOptions())
  const category = categories.find(c => c.id === categoryId)

  const { data: itemsData } = useSuspenseQuery(
    useCaseItemsQueryOptions({ categoryId, framework }),
  )

  if (!category) {
    return (
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <Link
            className="text-muted-hover text-foreground inline-flex items-center gap-2 transition-colors"
            to="/"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="mt-8">
            <h1 className="font-display text-foreground text-2xl font-bold">
              Category not found
            </h1>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-border border-b">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
            to="/"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="mt-4">
            <h1 className="font-display text-foreground text-3xl font-bold md:text-4xl">
              {category.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {category.description}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {itemsData.total} libraries found
            </p>
          </div>
        </div>
      </div>

      {/* Framework Filter */}
      <div className="border-border border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <span className="text-muted-foreground text-sm font-medium">
              Framework:
            </span>
            <div className="flex gap-2">
              {FRAMEWORK_OPTIONS.map(fw => (
                <button
                  className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    framework === fw.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 text-foreground border'
                  }`}
                  key={fw.id}
                  onClick={() => {
                    setFramework(fw.id)
                  }}
                  type="button"
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {itemsData.data.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-lg">
              No libraries found for this category and framework filter.
            </p>
            <p className="text-muted-foreground mt-2">
              Try selecting a different framework or return to the homepage.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {itemsData.data.map(item => (
              <RichItemCard
                item={{
                  ...item,
                  children: [],
                }}
                key={item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
