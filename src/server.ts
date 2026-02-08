/**
 * TanStack Start server entry point with Cloudflare Workers scheduled handler
 * Handles both HTTP requests and cron-triggered indexing
 */

import handler from '@tanstack/react-start/server-entry'

import { indexAllRegistries } from '@/lib/indexer'

export default {
  /**
   * Standard fetch handler for HTTP requests
   * Delegates to TanStack Start's default handler
   */
  fetch(request: Request, context?: unknown) {
    return handler.fetch(
      request,
      context as Parameters<typeof handler.fetch>[1],
    )
  },

  /**
   * Cloudflare Workers native scheduled handler
   * Triggered by cron expression defined in wrangler.json
   * Runs daily to index registry data from enhansome-registry repo
   */
  async scheduled(event: ScheduledEvent, env: { DB: D1Database }) {
    console.log('🕐 Cron triggered: starting registry indexing...')
    console.log(
      `  Scheduled time: ${new Date(event.scheduledTime).toISOString()}`,
    )
    console.log(`  Cron expression: ${event.cron}`)

    try {
      const result = await indexAllRegistries(env.DB, 'scheduled')

      console.log(
        `✅ Indexing complete: ${result.success} registries indexed, ${result.failed} failed`,
      )

      if (result.errors.length > 0) {
        console.error('❌ Errors encountered during indexing:')
        result.errors.forEach(error => {
          console.error(`  - ${error}`)
        })
      }
    } catch (error) {
      console.error('❌ Fatal indexing error:', error)
      console.error(
        '  Stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      )
    }
  },
}
