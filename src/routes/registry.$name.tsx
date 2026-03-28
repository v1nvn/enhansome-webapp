import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RegistryDetail } from '@/components/RegistryDetail'
import { NotFoundState } from '@/components/ui/StateComponents'
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
      <NotFoundState
        description={`The registry "${name}" doesn't exist.`}
        title="Registry not found"
      />
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
