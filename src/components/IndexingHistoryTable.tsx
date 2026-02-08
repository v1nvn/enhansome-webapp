import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  History,
  Loader2,
  User,
} from 'lucide-react'

import { formatRelativeTime, useCurrentTime } from '@/hooks/useCurrentTime'
import {
  getIndexingHistory,
  indexingHistoryQueryOptions,
} from '@/lib/server-functions'
import { formatDuration } from '@/utils/formatDuration'

import { useAdminApi } from './AdminApiContext'

export function IndexingHistoryTable() {
  const { apiKey } = useAdminApi()
  const currentTime = useCurrentTime()

  const { data: history = [] } = useQuery({
    ...indexingHistoryQueryOptions(),
    queryFn: () =>
      getIndexingHistory({
        headers: {
          'X-Admin-API-Key': apiKey ?? '',
        },
      }),
  })
  function renderStatusBadge(status: 'completed' | 'failed' | 'running') {
    const badges = {
      running: (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </span>
      ),
      completed: (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
          <CheckCircle className="h-3 w-3" />
          Done
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      ),
    }
    return badges[status]
  }

  function renderSourceBadge(
    source: 'manual' | 'scheduled',
    createdBy?: string,
  ) {
    if (source === 'manual') {
      return (
        <>
          <User className="text-chart-1 h-4 w-4" />
          <span className="text-foreground text-sm">Manual</span>
          {createdBy && (
            <span className="text-muted-foreground text-xs">({createdBy})</span>
          )}
        </>
      )
    }
    return (
      <>
        <Clock className="text-chart-3 h-4 w-4" />
        <span className="text-foreground text-sm">Scheduled</span>
      </>
    )
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <History className="text-primary h-5 w-5" />
          <h2 className="font-display text-foreground text-xl font-bold">
            Indexing History
          </h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-muted-foreground text-left text-sm">
              <th className="px-6 py-3 font-medium">When</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {history.map(entry => (
              <tr
                className="hover:bg-muted/30 transition-colors"
                key={entry.id}
              >
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium">
                      {formatRelativeTime(entry.startedAt, currentTime)}
                    </span>
                    {entry.completedAt && (
                      <span className="text-muted-foreground text-xs">
                        {new Date(entry.startedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {renderSourceBadge(entry.triggerSource, entry.createdBy)}
                  </div>
                </td>
                <td className="px-6 py-4">{renderStatusBadge(entry.status)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="text-foreground font-medium">
                    {formatDuration(entry.startedAt, entry.completedAt)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  {entry.status === 'completed' ? (
                    <div className="flex justify-end gap-3">
                      <span className="font-semibold text-green-600">
                        {entry.successCount}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-semibold text-red-600">
                        {entry.failedCount}
                      </span>
                    </div>
                  ) : entry.status === 'running' ? (
                    <span className="text-muted-foreground">
                      {entry.processedRegistries} /{' '}
                      {entry.totalRegistries || '?'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td
                  className="text-muted-foreground px-6 py-12 text-center"
                  colSpan={5}
                >
                  No indexing history yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
