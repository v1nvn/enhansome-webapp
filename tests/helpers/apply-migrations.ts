/**
 * Vitest setup file to apply D1 migrations before tests run
 * Migrations are loaded via TEST_MIGRATIONS binding in vitest.config.ts
 */

import { env, applyD1Migrations } from 'cloudflare:test'

export default async function () {
  // Apply migrations from TEST_MIGRATIONS binding
  // This runs once per test file before any tests execute
  try {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    console.log('✓ Migrations applied successfully')
  } catch (error) {
    console.error('Failed to apply migrations:', error)
    throw error
  }
}
