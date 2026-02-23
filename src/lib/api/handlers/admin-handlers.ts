/**
 * Admin API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

export interface IndexingHistoryEntry {
  completedAt?: string
  createdBy?: string
  currentRegistry?: string
  errorMessage?: string
  errors?: string[]
  failedCount?: number
  id: number
  processedRegistries?: number
  startedAt: string
  status: 'completed' | 'failed' | 'running'
  successCount?: number
  totalRegistries?: number
  triggerSource: 'manual' | 'scheduled'
}

export interface IndexingStatus {
  current: IndexingHistoryEntry | null
  isRunning: boolean
}

interface HistoryRow {
  completed_at: null | string
  created_by: null | string
  current_registry: null | string
  error_message: null | string
  errors: null | string
  failed_count: number
  id: number
  processed_registries: number
  started_at: string
  status: 'completed' | 'failed' | 'running'
  success_count: number
  total_registries: null | number
  trigger_source: 'manual' | 'scheduled'
}

export async function getIndexingHistoryHandler(
  db: Kysely<Database>,
): Promise<IndexingHistoryEntry[]> {
  const history = await (db as any)
    .selectFrom('indexing_history')
    .selectAll()
    .orderBy('started_at', 'desc')
    .limit(50)
    .execute()

  return history.map(historyRowToEntry)
}

export async function getIndexingStatusHandler(
  db: Kysely<Database>,
): Promise<IndexingStatus> {
  const result = await (db as any)
    .selectFrom('indexing_latest')
    .innerJoin(
      'indexing_history',
      'indexing_history.id',
      'indexing_latest.history_id',
    )
    .select([
      'indexing_history.id',
      'indexing_history.trigger_source',
      'indexing_history.status',
      'indexing_history.started_at',
      'indexing_history.completed_at',
      'indexing_history.total_registries',
      'indexing_history.processed_registries',
      'indexing_history.current_registry',
      'indexing_history.success_count',
      'indexing_history.failed_count',
      'indexing_history.errors',
      'indexing_history.error_message',
      'indexing_history.created_by',
      'indexing_latest.status as latest_status',
    ])
    .execute()

  if (result.length === 0) {
    return { current: null, isRunning: false }
  }

  const row = result[0]
  return {
    current: historyRowToEntry(row),
    isRunning: row.latest_status === 'running',
  }
}

export async function stopIndexingHandler(db: Kysely<Database>): Promise<{
  message: string
  status: 'not_running' | 'stopped'
  timestamp: string
}> {
  const result = await (db as any)
    .selectFrom('indexing_latest')
    .innerJoin(
      'indexing_history',
      'indexing_history.id',
      'indexing_latest.history_id',
    )
    .select(['indexing_history.id', 'indexing_history.status'])
    .execute()

  if (result.length === 0 || result[0].status !== 'running') {
    return {
      status: 'not_running',
      message: 'No indexing job is currently running',
      timestamp: new Date().toISOString(),
    }
  }

  const historyId = result[0].id
  const completedAt = new Date().toISOString()

  await (db as any)
    .updateTable('indexing_history')
    .set({
      completed_at: completedAt,
      current_registry: null,
      error_message: 'Indexing was manually stopped',
      status: 'failed',
    })
    .where('id', '=', historyId)
    .execute()

  await (db as any)
    .updateTable('indexing_latest')
    .set({
      status: 'failed',
      updated_at: completedAt,
    })
    .where('id', '=', 1)
    .execute()

  return {
    status: 'stopped',
    message: 'Indexing stopped successfully',
    timestamp: completedAt,
  }
}

function historyRowToEntry(row: HistoryRow): IndexingHistoryEntry {
  return {
    id: row.id,
    triggerSource: row.trigger_source,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    totalRegistries: row.total_registries ?? undefined,
    processedRegistries: row.processed_registries,
    currentRegistry: row.current_registry ?? undefined,
    successCount: row.success_count,
    failedCount: row.failed_count,
    errors: row.errors ? (JSON.parse(row.errors) as string[]) : undefined,
    errorMessage: row.error_message ?? undefined,
    createdBy: row.created_by ?? undefined,
  }
}
