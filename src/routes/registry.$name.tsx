import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RegistryDetail } from '@/components/RegistryDetail'
import { registryDetailQueryOptions } from '@/lib/api/server-functions'

export const Route = createFileRoute('/registry/$name')({
  component: RegistryDetailPage,
  loader: ({ context, params }) => {
    // Preload registry detail data
    void context.queryClient.ensureQueryData(
      registryDetailQueryOptions(params.name),
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

  return <RegistryDetail data={data} />
}
