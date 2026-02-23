import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RepoDetail } from '@/components/RepoDetail'
import { repoDetailQueryOptions } from '@/lib/api/server-functions'

export const Route = createFileRoute('/repo/$owner/$name')({
  component: RepoDetailPage,
  loader: ({ context, params }) => {
    // Preload repo detail data
    void context.queryClient.ensureQueryData(
      repoDetailQueryOptions(params.owner, params.name),
    )
  },
  pendingComponent: () => (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="bg-muted mx-auto h-12 w-12 animate-pulse rounded-full" />
        <p className="text-muted-foreground mt-4">Loading repository...</p>
      </div>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      {
        title: `Enhansome - ${params.owner}/${params.name}`,
      },
    ],
  }),
})

function RepoDetailPage() {
  const { owner, name } = Route.useParams()

  const { data } = useSuspenseQuery(repoDetailQueryOptions(owner, name))

  if (!data) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg
            className="text-muted-foreground mx-auto mb-4 h-16 w-16"
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
          <h2 className="font-display text-foreground text-2xl font-bold">
            Repository not found
          </h2>
          <p className="text-muted-foreground mt-2">
            The repository &quot;{owner}/{name}&quot; doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  return <RepoDetail data={data} />
}
