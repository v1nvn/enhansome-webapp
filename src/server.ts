/**
 * TanStack Start server entry point with Cloudflare Workers
 * Handles HTTP requests and MCP protocol
 */

import handler from '@tanstack/react-start/server-entry'

import { handleMcpRequest, isMcpRequest } from '@/lib/mcp'

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
}
