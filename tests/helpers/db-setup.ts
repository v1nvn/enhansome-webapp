/**
 * Database utilities for test setup and teardown
 */

/**
 * Clear all data from the database
 * Useful in beforeEach hooks to ensure test isolation
 *
 * Clear order matters due to foreign key constraints:
 * 1. Child tables first (registry_repositories, registry_featured)
 * 2. Parent tables (repositories, registry_metadata)
 * 3. Other tables
 */
export async function clearDatabase(db: D1Database): Promise<void> {
  // Clear junction table first (has FKs to both repositories and registry_metadata)
  try {
    await db.prepare('DELETE FROM registry_repositories').run()
  } catch (e) {
    console.warn('Could not clear registry_repositories:', e)
  }

  // Clear featured registries (has FK to registry_metadata)
  try {
    await db.prepare('DELETE FROM registry_featured').run()
  } catch (e) {
    console.warn('Could not clear registry_featured:', e)
  }

  // Clear repositories (parent table, no FKs from others after registry_repositories is cleared)
  try {
    await db.prepare('DELETE FROM repositories').run()
  } catch (e) {
    console.warn('Could not clear repositories:', e)
  }

  // Clear registry metadata (parent table)
  try {
    await db.prepare('DELETE FROM registry_metadata').run()
  } catch (e) {
    console.warn('Could not clear registry_metadata:', e)
  }

  // Clear sync log
  try {
    await db.prepare('DELETE FROM sync_log').run()
  } catch (e) {
    console.warn('Could not clear sync_log:', e)
  }

  // Clear indexing history
  try {
    await db.prepare('DELETE FROM indexing_history').run()
  } catch (e) {
    console.warn('Could not clear indexing_history:', e)
  }

  // Reset indexing latest to idle state
  try {
    await db
      .prepare('UPDATE indexing_latest SET status = ?, history_id = NULL, updated_at = datetime("now") WHERE id = 1')
      .bind('idle')
      .run()
  } catch (e) {
    console.warn('Could not reset indexing_latest:', e)
  }
}
