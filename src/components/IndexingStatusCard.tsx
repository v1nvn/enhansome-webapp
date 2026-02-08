import { useQuery } from '@tanstack/react-query'

import { formatRelativeTime, useCurrentTime } from '@/hooks/useCurrentTime'
import {
  getIndexingStatus,
  indexingStatusQueryOptions,
} from '@/lib/server-functions'

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
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border border-b px-6 py-4">
        <h2 className="font-display text-foreground text-xl font-bold">
          Current Status
        </h2>
      </div>
      <div className="p-6">
        {/* Status Header */}
        <div className="mb-4 flex items-center gap-2">
          <IndexingStatusIcon current={current} isRunning={isRunning} />
          <div>
            <p className="text-foreground font-semibold">{getStatusTitle()}</p>
            <p className="text-muted-foreground text-sm">
              {getStatusSubtitle()}
            </p>
          </div>
        </div>

        {/* Running State Details */}
        {isRunning &&
          current?.totalRegistries != null &&
          current.processedRegistries != null && (
            <>
              <div className="bg-muted mb-2 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{
                    width: `${(current.processedRegistries / current.totalRegistries) * 100}%`,
                  }}
                />
              </div>
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>
                  {current.processedRegistries} / {current.totalRegistries}{' '}
                  registries
                </span>
                <span>
                  {Math.round(
                    (current.processedRegistries / current.totalRegistries) *
                      100,
                  )}
                  %
                </span>
              </div>
            </>
          )}

        {isRunning && current?.currentRegistry && (
          <div className="bg-muted/50 text-muted-foreground mt-4 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium">Current:</span>{' '}
            {current.currentRegistry}
          </div>
        )}

        {/* Completed State Details */}
        {current?.status === 'completed' &&
          current.successCount !== undefined &&
          current.failedCount !== undefined && (
            <div className="text-muted-foreground flex gap-4 text-sm">
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
