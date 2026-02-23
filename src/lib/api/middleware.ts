/**
 * Admin API key authentication middleware for server functions
 * Validates that a valid API key is provided in the X-Admin-API-Key header
 */

import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

/**
 * Server function middleware that validates admin API keys from headers
 * Throws an error if the API key is invalid or missing
 */
export const adminAuthMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  // Read API key from header
  const apiKey = getRequestHeader('X-Admin-API-Key')
  const validKeys = env.ADMIN_API_KEYS
    ? env.ADMIN_API_KEYS.split(',').map(k => k.trim())
    : []

  if (!apiKey || !validKeys.includes(apiKey)) {
    throw new Error('Unauthorized: Invalid or missing API key')
  }

  return next()
})
