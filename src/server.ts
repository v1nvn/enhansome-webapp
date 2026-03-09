/**
 * TanStack Start server entry point with Cloudflare Workers
 * Handles HTTP requests, cron triggers, and workflows
 */

import handler from '@tanstack/react-start/server-entry'

import { handleMcpRequest, isMcpRequest } from '@/lib/mcp'
export { IndexingWorkflow } from '@/lib/workflows/indexing-workflow'

export default {
  /**
   * Standard fetch handler for HTTP requests
   * Intercepts /mcp requests for MCP protocol, delegates others to TanStack Start
   */
  async fetch(request: Request, context?: unknown): Promise<Response> {
    // Intercept /mcp requests for MCP protocol
    if (isMcpRequest(request)) {
      return handleMcpRequest(request)
    }

    // Delegate all other requests to TanStack Start
    return handler.fetch(
      request,
      context as Parameters<typeof handler.fetch>[1],
    )
  },

  /**
   * Cloudflare Workers scheduled handler
   * Triggered by cron expression defined in wrangler.jsonc
   * Creates a workflow instance for asynchronous processing
   */
  async scheduled(event: ScheduledEvent, env: Env) {
    console.log('Cron triggered: starting indexing workflow...')
    console.log(
      `  Scheduled time: ${new Date(event.scheduledTime).toISOString()}`,
    )
    console.log(`  Cron expression: ${event.cron}`)

    try {
      // Create workflow instance for scheduled indexing
      const instance = await env.INDEXING_WORKFLOW.create({
        params: {
          triggerSource: 'scheduled',
        },
      })

      console.log(`Indexing workflow ${instance.id} started from cron trigger`)
    } catch (error) {
      console.error('Failed to start scheduled indexing workflow:', error)
      console.error(
        '  Stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      )
    }
  },
}
