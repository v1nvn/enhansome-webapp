import { useQuery } from '@tanstack/react-query'

import { formatRelativeTime, useCurrentTime } from '@/hooks/useCurrentTime'
import {
  getIndexingStatus,
  indexingStatusQueryOptions,
} from '@/lib/api/server-functions'

import { useAdminApi } from './AdminApiContext'
import { IndexingStatusIcon } from './IndexingStatusIcon'

export function IndexingStatusCard() {
  const { apiKey } = useAdminApi()
  const currentTime = useCurrentTime()

  const { data: status } = useQuery({
    ...indexingStatusQueryOptions(),
    queryFn: () =>
      getIndexingStatus({
        headers: {
          'X-Admin-API-Key': apiKey ?? '',
        },
      }),
  })

  const isRunning = status?.isRunning ?? false
  const current = status?.current
  const getStatusTitle = (): string => {
    if (isRunning && current) return 'Indexing in progress'
    if (current?.status === 'completed') return 'Indexing completed'
    if (current?.status === 'failed') return 'Indexing failed'
    return 'Idle'
  }

  const getStatusSubtitle = (): string => {
    if (!current?.startedAt) return 'No indexing in progress'
    return formatRelativeTime(current.startedAt, currentTime)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          Current Status
        </h2>
      </div>
      <div className="p-6">
        {/* Status Header */}
        <div className="mb-4 flex items-center gap-2">
          <IndexingStatusIcon current={current} isRunning={isRunning} />
          <div>
            <p className="font-semibold text-foreground">{getStatusTitle()}</p>
            <p className="text-sm text-muted-foreground">
              {getStatusSubtitle()}
            </p>
          </div>
        </div>

        {/* Running State Details */}
        {isRunning && current?.progress != null && (
          <>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${current.progress}%` }}
              />
            </div>
            <div className="flex justify-end text-sm text-muted-foreground">
              <span>{current.progress}%</span>
            </div>
          </>
        )}

        {isRunning && current?.currentStep && (
          <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium">Step:</span> {current.currentStep}
          </div>
        )}

        {/* Completed State Details */}
        {current?.status === 'completed' &&
          current.successCount !== undefined &&
          current.failedCount !== undefined && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-green-600">
                  {current.successCount}
                </span>{' '}
                succeeded
              </span>
              <span>
                <span className="font-semibold text-red-600">
                  {current.failedCount}
                </span>{' '}
                failed
              </span>
            </div>
          )}

        {/* Failed State Details */}
        {current?.status === 'failed' && current.errorMessage && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {current.errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
