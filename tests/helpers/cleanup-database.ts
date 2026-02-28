/**
 * Database cleanup utilities for test setup and teardown
 * Kysely-compatible version of the D1-based clearDatabase
 */

import type { Kysely } from 'kysely'

import type { Database } from '@/types/database'

/**
 * Clear all data from the database using Kysely
 * Useful in beforeEach hooks to ensure test isolation
 *
 * Clear order matters due to foreign key constraints:
 * 1. Child tables first (registry_repositories, registry_featured)
 * 2. Parent tables (repositories, registry_metadata)
 * 3. Other tables
 */
export async function clearDatabase(db: Kysely<Database>): Promise<void> {
  // Clear order matters due to foreign key constraints

  // 1. Denormalized facets table (no FKs, safe to clear first)
  await db.deleteFrom('repository_facets').execute()

  // 2. Category junction table (has FKs to categories, repositories, registry_metadata)
  await db.deleteFrom('registry_repository_categories').execute()

  // 2. registry_repositories (has FKs to repositories and registry_metadata)
  await db.deleteFrom('registry_repositories').execute()

  // 3. Featured registries (has FK to registry_metadata)
  await db.deleteFrom('registry_featured').execute()

  // 4. Categories table (parent table)
  await db.deleteFrom('categories').execute()

  // 5. Repositories (parent table)
  await db.deleteFrom('repositories').execute()

  // 6. Registry metadata (parent table)
  await db.deleteFrom('registry_metadata').execute()

  // Clear sync log
  await db.deleteFrom('sync_log').execute()

  // Clear indexing history
  await db.deleteFrom('indexing_history').execute()

  // Reset indexing latest to idle state
  await db
    .updateTable('indexing_latest')
    .set({
      history_id: null,
      status: 'idle',
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', 1)
    .execute()
}
