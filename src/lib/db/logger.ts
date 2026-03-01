/**
 * Kysely query logger
 * Logs warnings for slow queries (> 10ms) and errors for failed queries
 */

import type { LogEvent } from 'kysely'

const SLOW_QUERY_THRESHOLD_MS = 100

export function createQueryLogger() {
  return (event: LogEvent): void => {
    if (event.level === 'error') {
      console.error('[DB] Query error:', {
        durationMs: event.queryDurationMillis,
        sql: event.query.sql,
        params: event.query.parameters,
        error: event.error,
      })
      return
    }

    // 'query' level - log slow queries as warnings
    if (event.queryDurationMillis > SLOW_QUERY_THRESHOLD_MS) {
      console.warn('[DB] Slow query:', {
        durationMs: event.queryDurationMillis,
        sql: event.query.sql,
        params: event.query.parameters,
      })
    }
  }
}
