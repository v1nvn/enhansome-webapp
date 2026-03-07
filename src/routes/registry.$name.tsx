import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RegistryDetail } from '@/components/RegistryDetail'
import {
  filterOptionsQueryOptions,
  registryDetailQueryOptions,
} from '@/lib/api/server-functions'

interface RegistrySearch {
  cat?: string
  q?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
  tag?: string
}

export const Route = createFileRoute('/registry/$name')({
  component: RegistryDetailPage,
  validateSearch: (search: Record<string, unknown>): RegistrySearch => ({
    cat: search.cat as string | undefined,
    q: search.q as string | undefined,
    sort:
      (search.sort as 'name' | 'quality' | 'stars' | 'updated' | undefined) ||
      'quality',
    tag: search.tag as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    cat: search.cat,
    tag: search.tag,
  }),
  loader: async ({ context, params, deps }) => {
    // Preload registry detail data
    await context.queryClient.ensureQueryData(
      registryDetailQueryOptions(params.name),
    )
    // Preload filter options for initial render
    await context.queryClient.ensureQueryData(
      filterOptionsQueryOptions({
        categoryName: deps.cat,
        registryName: params.name,
        tagName: deps.tag,
      }),
    )
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
        <p className="mt-4 text-muted-foreground">Loading registry...</p>
      </div>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      {
        title: `Enhansome - ${params.name} Registry`,
      },
    ],
  }),
})

function RegistryDetailPage() {
  const { name } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data } = useSuspenseQuery(registryDetailQueryOptions(name))

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Registry not found
          </h2>
          <p className="mt-2 text-muted-foreground">
            The registry &quot;{name}&quot; doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  const handleSearchParamsChange = (
    newParams: Omit<RegistrySearch, 'sort'> & { sort?: RegistrySearch['sort'] },
  ) => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        cat: newParams.cat,
        q: newParams.q,
        sort: newParams.sort || 'quality',
        tag: newParams.tag,
      }),
    })
  }

  return (
    <RegistryDetail
      initialData={{
        description: data.description,
        last_updated: data.last_updated,
        source_repository: data.source_repository,
        title: data.title,
        total_items: data.total_items,
        total_stars: data.total_stars,
      }}
      onSearchParamsChange={handleSearchParamsChange}
      registryName={name}
      searchParams={{
        cat: search.cat,
        q: search.q,
        sort: search.sort || 'quality',
        tag: search.tag,
      }}
    />
  )
}
