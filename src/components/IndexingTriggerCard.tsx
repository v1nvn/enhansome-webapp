import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Square } from 'lucide-react'

import {
  getIndexingStatus,
  indexingStatusQueryOptions,
  stopIndexing,
  triggerIndexRegistries,
} from '@/lib/api/server-functions'

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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          Trigger Indexing
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* API Key Display */}
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Admin API Key
            </span>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-2 text-sm">
              <span className="text-muted-foreground">
                {apiKey ? `••••••••••${apiKey.slice(-4)}` : 'No API key set'}
              </span>
              <button
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-destructive px-4 py-3 font-semibold text-destructive-foreground shadow-sm transition-all hover:bg-destructive/90 focus:ring-2 focus:ring-destructive focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
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
