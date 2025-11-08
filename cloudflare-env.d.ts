/**
 * TypeScript declarations for Cloudflare Workers environment
 * and Vitest integration
 */

import type { D1Migration } from '@cloudflare/vitest-pool-workers'

/**
 * Augment the cloudflare:test module with our environment bindings
 */
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    /**
     * D1 database binding for registry data
     */
    DB: D1Database

    /**
     * Test-only binding for D1 migrations
     * Populated by vitest.config.ts from readD1Migrations()
     */
    TEST_MIGRATIONS?: D1Migration[]
  }
}

/**
 * Cloudflare Workers types for scheduled events
 */
interface ScheduledEvent {
  /**
   * The cron expression used to trigger this event
   */
  cron: string

  /**
   * The timestamp (milliseconds since epoch) when this event was scheduled
   */
  scheduledTime: number

  /**
   * The type of event (always "scheduled" for cron triggers)
   */
  type: 'scheduled'
}

/**
 * Cloudflare Workers execution context
 */
interface ExecutionContext {
  /**
   * Extend the lifetime of the event handler
   */
  waitUntil(promise: Promise<unknown>): void

  /**
   * Prevents a request from failing due to an unhandled exception
   */
  passThroughOnException(): void
}
