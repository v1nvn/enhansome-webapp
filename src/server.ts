/**
 * TanStack Start server entry point with Cloudflare Workers
 * Handles HTTP requests, cron triggers, and queue messages
 */

import handler from '@tanstack/react-start/server-entry'

import type { IndexingQueueMessage } from '@/types/queue'
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
   * Cloudflare Workers scheduled handler
   * Triggered by cron expression defined in wrangler.jsonc
   * Sends a message to the queue for asynchronous processing
   */
  async scheduled(
    event: ScheduledEvent,
    env: { DB: D1Database; INDEXING_QUEUE: Queue },
  ) {
    console.log('🕐 Cron triggered: queuing indexing job...')
    console.log(
      `  Scheduled time: ${new Date(event.scheduledTime).toISOString()}`,
    )
    console.log(`  Cron expression: ${event.cron}`)

    try {
      // Create queue message for scheduled indexing
      const message: IndexingQueueMessage = {
        jobId: crypto.randomUUID(),
        triggerSource: 'scheduled',
        timestamp: new Date().toISOString(),
      }

      // Send to queue for processing
      await env.INDEXING_QUEUE.send(message)

      console.log(
        `✅ Indexing job ${message.jobId} queued from cron trigger`,
      )
    } catch (error) {
      console.error('❌ Failed to queue scheduled indexing:', error)
      console.error(
        '  Stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      )
    }
  },

  /**
   * Cloudflare Workers queue consumer handler
   * Processes indexing messages from the queue
   */
  async queue(
    batch: MessageBatch<IndexingQueueMessage>,
    env: { DB: D1Database; INDEXING_QUEUE: Queue },
  ): Promise<void> {
    console.log(`📬 Processing ${batch.messages.length} indexing message(s)`)

    // Process messages sequentially to avoid concurrent indexing
    for (const message of batch.messages) {
      const { body } = message

      console.log(
        `🔄 Processing job ${body.jobId} (source: ${body.triggerSource})`,
      )

      try {
        // Call the indexer with message data
        const result = await indexAllRegistries(
          env.DB,
          body.triggerSource,
          body.createdBy,
          body.archiveUrl,
        )

        console.log(
          `✅ Job ${body.jobId} complete: ${result.success} registries indexed, ${result.failed} failed`,
        )

        if (result.errors.length > 0) {
          console.error(`❌ Errors in job ${body.jobId}:`)
          result.errors.forEach(error => {
            console.error(`  - ${error}`)
          })
        }

        // Message is implicitly acknowledged on successful completion
      } catch (error) {
        console.error(`❌ Job ${body.jobId} failed:`, error)
        console.error(
          '  Stack:',
          error instanceof Error ? error.stack : 'No stack trace',
        )

        // Retry the message - Cloudflare will automatically retry
        throw error
      }
    }
  },
}
