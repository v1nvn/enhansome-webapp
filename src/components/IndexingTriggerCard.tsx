import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Square } from 'lucide-react'

import {
  getIndexingStatus,
  indexingStatusQueryOptions,
  stopIndexing,
  triggerIndexRegistries,
} from '@/lib/server-functions'

import { useAdminApi } from './AdminApiContext'

export function IndexingTriggerCard() {
  const { apiKey, onClearAuth } = useAdminApi()
  const queryClient = useQueryClient()

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
      // Invalidate the status query to trigger a refetch
      // The status will now show "running" immediately
      void queryClient.invalidateQueries({
        queryKey: ['indexing-status'],
      })
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      return stopIndexing({
        headers: {
          'X-Admin-API-Key': apiKey ?? '',
        },
      })
    },
    onSuccess: () => {
      // Invalidate the status query to trigger a refetch
      void queryClient.invalidateQueries({
        queryKey: ['indexing-status'],
      })
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
                disabled={mutation.isPending || stopMutation.isPending}
                onClick={onClearAuth}
                type="button"
              >
                Change
              </button>
            </div>
          </div>

          {/* Trigger/Stop Button */}
          {isRunning ? (
            <button
              className="border-border bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={stopMutation.isPending}
              onClick={() => {
                stopMutation.mutate()
              }}
              type="button"
            >
              {stopMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span>Stop Indexing</span>
                </>
              )}
            </button>
          ) : (
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:hover:bg-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate()
              }}
              type="button"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Trigger Indexing</span>
                </>
              )}
            </button>
          )}

          {mutation.error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {mutation.error.message}
            </div>
          )}

          {stopMutation.error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {stopMutation.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
