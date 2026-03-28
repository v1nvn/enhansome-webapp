import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { RepoDetail } from '@/components/RepoDetail'
import { NotFoundState } from '@/components/ui/StateComponents'
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
        <p className="mt-4 text-muted-foreground">Loading repository...</p>
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
      <NotFoundState
        description={`The repository "${owner}/${name}" doesn't exist.`}
        title="Repository not found"
      />
    )
  }

  return <RepoDetail data={data} />
}
