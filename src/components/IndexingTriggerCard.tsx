import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'

import {
  getIndexingStatus,
  indexingStatusQueryOptions,
  triggerIndexRegistries,
} from '@/lib/server-functions'

import { useAdminApi } from './AdminApiContext'

export function IndexingTriggerCard() {
  const { apiKey, onClearAuth } = useAdminApi()

  const { data: status } = useQuery({
    ...indexingStatusQueryOptions(),
    queryFn: () =>
      getIndexingStatus({
        headers: {
          'X-Admin-API-Key': apiKey ?? '',
        },
      }),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      return triggerIndexRegistries({
        headers: {
          'X-Admin-API-Key': apiKey ?? '',
        },
      })
    },
    onSuccess: () => {
      setTimeout(() => {
        window.location.reload()
      }, 500)
    },
  })

  const isRunning = status?.isRunning ?? false

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border border-b px-6 py-4">
        <h2 className="font-display text-foreground text-xl font-bold">
          Trigger Indexing
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* API Key Display */}
          <div>
            <span className="text-foreground mb-2 block text-sm font-medium">
              Admin API Key
            </span>
            <div className="border-border bg-muted flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
              <span className="text-muted-foreground">
                {apiKey ? `••••••••••${apiKey.slice(-4)}` : 'No API key set'}
              </span>
              <button
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                disabled={isRunning || mutation.isPending}
                onClick={onClearAuth}
                type="button"
              >
                Change
              </button>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:hover:bg-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRunning || mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
            type="button"
          >
            {isRunning || mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Indexing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Trigger Indexing</span>
              </>
            )}
          </button>

          {mutation.error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {mutation.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
