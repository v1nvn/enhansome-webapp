/**
 * Database utilities for test setup and teardown
 */

/**
 * Clear all data from the database
 * Useful in beforeEach hooks to ensure test isolation
 */
export async function clearDatabase(db: D1Database): Promise<void> {
  try {
    await db.prepare('DELETE FROM sync_log').run()
  } catch (e) {
    // Table might not exist yet in this isolated environment
    console.warn('Could not clear sync_log:', e)
  }

  try {
    await db.prepare('DELETE FROM registry_items').run()
  } catch (e) {
    console.warn('Could not clear registry_items:', e)
  }

  try {
    await db.prepare('DELETE FROM registry_metadata').run()
  } catch (e) {
    console.warn('Could not clear registry_metadata:', e)
  }
}
