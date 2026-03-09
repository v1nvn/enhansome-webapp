/**
 * Integration tests for admin indexing functionality
 * Tests the progress tracking, history logging, and admin server functions
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import { createKysely } from '@/lib/db'
import {
  getIndexingHistoryHandler,
  getIndexingStatusHandler,
  stopIndexingHandler,
} from '@/lib/api/handlers/admin-handlers'
import { TEST_ARCHIVE_URL } from './test_utils'

/**
 * Helper function to run full indexing using workflow steps
 * This replaces the old indexAllRegistries function for testing
 */
async function runIndexing(
  db: D1Database,
  triggerSource: 'manual' | 'scheduled' = 'scheduled',
  createdBy?: string,
  archiveUrl?: string,
): Promise<{ errors: string[]; failed: number; success: number }> {
  const {
    checkIsIndexingRunning,
    createWorkflowHistoryEntry,
    fetchAndCollectStep,
    finalizeStep,
    markIndexingFailed,
    rebuildFacetsStep,
    rebuildFtsStep,
    setIndexingRunning,
    writeAssociationsStep,
    writeCategoriesStep,
    writeRepositoriesStep,
    writeTagsAndMetadataStep,
  } = await import('@/lib/indexer')

  // Check if already running
  if (await checkIsIndexingRunning(db)) {
    return { success: 0, failed: 0, errors: ['Indexing already in progress'] }
  }

  // Create history entry
  const historyId = await createWorkflowHistoryEntry(db, triggerSource, createdBy)
  await setIndexingRunning(db, historyId)

  try {
    // Step 1: Fetch and collect
    const fetchResult = await fetchAndCollectStep(db, {
      historyId,
      triggerSource,
      archiveUrl,
      createdBy,
    })

    // Steps 2-5: Write data
    await writeRepositoriesStep(db, historyId, fetchResult.collected)
    await writeTagsAndMetadataStep(db, historyId, fetchResult.collected)
    await writeAssociationsStep(db, historyId, fetchResult.collected)
    await writeCategoriesStep(db, historyId, fetchResult.collected)

    // Steps 6-7: Rebuild indexes
    await rebuildFacetsStep(db, historyId)
    await rebuildFtsStep(db, historyId)

    // Step 8: Finalize
    await finalizeStep(db, historyId, {
      errors: fetchResult.errors,
      failed: fetchResult.failed,
      success: fetchResult.success,
    })

    return {
      errors: fetchResult.errors,
      failed: fetchResult.failed,
      success: fetchResult.success,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await markIndexingFailed(db, historyId, errorMsg)
    throw error
  }
}

describe('Admin Indexing with Progress Tracking', () => {
  beforeAll(async () => {
    // Apply migrations
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    // Clear database between tests
    const db = createKysely(env.DB)
    await db.deleteFrom('indexing_history').execute()
    // Don't delete from indexing_latest - always keep the single row
    // Reset indexing_latest to idle state
    await db
      .updateTable('indexing_latest')
      .set({ history_id: null, status: 'idle', updated_at: new Date().toISOString() })
      .execute()
    await db.deleteFrom('sync_log').execute()
    // Clear in correct order due to foreign key constraints
    await db.deleteFrom('registry_repositories').execute()
    await db.deleteFrom('repositories').execute()
    await db.deleteFrom('registry_metadata').execute()
  })

  describe('indexing_history table', () => {
    it('should have indexing_history table created', async () => {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='indexing_history'",
      ).first()

      expect(result).toBeDefined()
      expect(result?.name).toBe('indexing_history')
    })

    it('should have correct columns in indexing_history', async () => {
      const result = await env.DB.prepare('PRAGMA table_info(indexing_history)').all()

      const expectedColumns = [
        'id',
        'trigger_source',
        'status',
        'started_at',
        'completed_at',
        'total_registries',
        'progress',
        'current_step',
        'success_count',
        'failed_count',
        'errors',
        'error_message',
        'created_by',
        'created_at',
      ]

      expect(result.results).toHaveLength(expectedColumns.length)
      const columns = result.results.map((r: Record<string, unknown>) => String(r.name))
      expect(columns).toEqual(expect.arrayContaining(expectedColumns))
    })

    it('should create history entry on indexing start', async () => {
      // This test verifies that a history entry is created when indexing starts
      const db = createKysely(env.DB)

      // Check initial state
      const beforeHistory = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(beforeHistory).toHaveLength(0)

      // Note: We can't easily test the full indexing flow in tests
      // as it requires fetching from external GitHub URLs
      // Instead, we verify the table structure and that entries can be created
      await db
        .insertInto('indexing_history')
        .values({
          trigger_source: 'manual',
          status: 'running',
          started_at: new Date().toISOString(),
          created_by: 'test-key',
          failed_count: 0,
          progress: 0,
          success_count: 0,
        })
        .execute()

      const afterHistory = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(afterHistory).toHaveLength(1)
      expect(afterHistory[0].trigger_source).toBe('manual')
      expect(afterHistory[0].status).toBe('running')
      expect(afterHistory[0].created_by).toBe('test-key')
    })
  })

  describe('indexing_latest table', () => {
    it('should have indexing_latest table created', async () => {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='indexing_latest'",
      ).first()

      expect(result).toBeDefined()
      expect(result?.name).toBe('indexing_latest')
    })

    it('should have correct columns in indexing_latest', async () => {
      const result = await env.DB.prepare('PRAGMA table_info(indexing_latest)').all()

      const expectedColumns = ['id', 'history_id', 'status', 'updated_at']

      expect(result.results).toHaveLength(expectedColumns.length)
      const columns = result.results.map((r: Record<string, unknown>) => String(r.name))
      expect(columns).toEqual(expect.arrayContaining(expectedColumns))
    })

    it('should be initialized with idle status', async () => {
      const result = await env.DB.prepare(
        'SELECT * FROM indexing_latest ORDER BY updated_at DESC LIMIT 1',
      ).first()

      expect(result).toBeDefined()
      expect(result?.status).toBe('idle')
      expect(result?.id).toBe(1)
    })

    it('should allow updating status', async () => {
      const db = createKysely(env.DB)

      // Create a history entry first using raw D1
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, created_by) VALUES (?, ?, ?, ?)',
      )
        .bind('manual', 'running', new Date().toISOString(), 'test-key')
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      const result = await env.DB.prepare(
        'SELECT * FROM indexing_latest ORDER BY updated_at DESC LIMIT 1',
      ).first()

      expect(result?.status).toBe('running')
      expect(result?.history_id).toBe(historyId)
    })
  })

  describe('getIndexingStatusHandler', () => {
    it('should return idle status when no indexing has run', async () => {
      const db = createKysely(env.DB)
      const result = await getIndexingStatusHandler(db)

      expect(result).toBeDefined()
      expect(result.isRunning).toBe(false)
      expect(result.current).toBeNull()
    })

    it('should return current status when history exists', async () => {
      const db = createKysely(env.DB)

      // Create a completed history entry
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, completed_at, total_registries, progress, success_count, failed_count, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'completed',
          new Date(Date.now() - 10000).toISOString(),
          new Date().toISOString(),
          5,
          100,
          5,
          0,
          'test-key',
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .execute()

      const result = await getIndexingStatusHandler(db)

      expect(result).toBeDefined()
      expect(result.isRunning).toBe(false)
      expect(result.current).toBeDefined()
      expect(result.current?.status).toBe('completed')
      expect(result.current?.triggerSource).toBe('manual')
      expect(result.current?.createdBy).toBe('test-key')
    })

    it('should return running status when indexing is in progress', async () => {
      const db = createKysely(env.DB)

      // Create a running history entry using raw D1
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, progress, success_count, failed_count, current_step) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'scheduled',
          'running',
          new Date().toISOString(),
          5,
          2,
          2,
          0,
          'go',
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      const result = await getIndexingStatusHandler(db)

      expect(result).toBeDefined()
      expect(result.isRunning).toBe(true)
      expect(result.current).toBeDefined()
      expect(result.current?.status).toBe('running')
      expect(result.current?.triggerSource).toBe('scheduled')
      expect(result.current?.currentStep).toBe('go')
    })
  })

  describe('getIndexingHistoryHandler', () => {
    it('should return empty array when no history exists', async () => {
      const db = createKysely(env.DB)
      const result = await getIndexingHistoryHandler(db)

      expect(result).toEqual([])
    })

    it('should return history entries ordered by started_at desc', async () => {
      const db = createKysely(env.DB)

      const now = Date.now()

      // Create three history entries
      await db
        .insertInto('indexing_history')
        .values([
          {
            completed_at: new Date(now - 3000).toISOString(),
            failed_count: 0,
            progress: 100,
            started_at: new Date(now - 5000).toISOString(),
            status: 'completed',
            success_count: 5,
            total_registries: 5,
            trigger_source: 'scheduled',
          },
          {
            completed_at: new Date(now - 1000).toISOString(),
            created_by: 'abcd',
            failed_count: 0,
            progress: 100,
            started_at: new Date(now - 2000).toISOString(),
            status: 'completed',
            success_count: 5,
            total_registries: 5,
            trigger_source: 'manual',
          },
          {
            completed_at: new Date(now - 7000).toISOString(),
            failed_count: 0,
            progress: 100,
            started_at: new Date(now - 8000).toISOString(),
            status: 'completed',
            success_count: 5,
            total_registries: 5,
            trigger_source: 'scheduled',
          },
        ])
        .execute()

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(3)
      // Should be ordered by started_at DESC
      expect(result[0].triggerSource).toBe('manual') // Most recent
      expect(result[1].triggerSource).toBe('scheduled')
      expect(result[2].triggerSource).toBe('scheduled') // Oldest
    })

    it('should include all history entry fields', async () => {
      const db = createKysely(env.DB)

      await db
        .insertInto('indexing_history')
        .values({
          completed_at: new Date().toISOString(),
          created_by: 'test-key',
          errors: JSON.stringify(['error1', 'error2']),
          failed_count: 1,
          progress: 100,
          started_at: new Date().toISOString(),
          status: 'completed',
          success_count: 4,
          total_registries: 5,
          trigger_source: 'manual',
        })
        .execute()

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: expect.any(Number),
        triggerSource: 'manual',
        status: 'completed',
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        totalRegistries: 5,
        progress: 100,
        successCount: 4,
        failedCount: 1,
        errors: ['error1', 'error2'],
        createdBy: 'test-key',
      })
    })

    it('should limit to last 50 runs', async () => {
      const db = createKysely(env.DB)

      // Create 55 history entries in batches to avoid SQLite variable limit
      for (let i = 0; i < 55; i++) {
        await db
          .insertInto('indexing_history')
          .values({
            completed_at: new Date().toISOString(),
            failed_count: 0,
            progress: 100,
            started_at: new Date(Date.now() - i * 1000).toISOString(),
            status: 'completed',
            success_count: 5,
            total_registries: 5,
            trigger_source: 'scheduled',
          })
          .execute()
      }

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(50)
    })
  })

  describe('trigger source tracking', () => {
    it('should correctly identify manual runs', async () => {
      const db = createKysely(env.DB)

      await db
        .insertInto('indexing_history')
        .values({
          completed_at: new Date().toISOString(),
          created_by: 'a3b4',
          failed_count: 0,
          progress: 100,
          started_at: new Date().toISOString(),
          status: 'completed',
          success_count: 5,
          total_registries: 5,
          trigger_source: 'manual',
        })
        .execute()

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(1)
      expect(result[0].triggerSource).toBe('manual')
      expect(result[0].createdBy).toBe('a3b4')
    })

    it('should correctly identify scheduled runs', async () => {
      const db = createKysely(env.DB)

      await db
        .insertInto('indexing_history')
        .values({
          completed_at: new Date().toISOString(),
          created_by: null,
          failed_count: 0,
          progress: 100,
          started_at: new Date().toISOString(),
          status: 'completed',
          success_count: 5,
          total_registries: 5,
          trigger_source: 'scheduled',
        })
        .execute()

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(1)
      expect(result[0].triggerSource).toBe('scheduled')
      expect(result[0].createdBy).toBeUndefined()
    })
  })

  describe('failed indexing', () => {
    it('should record failed status with error message', async () => {
      const db = createKysely(env.DB)

      await db
        .insertInto('indexing_history')
        .values({
          completed_at: new Date().toISOString(),
          error_message: 'Network error: Failed to fetch registry data',
          failed_count: 0,
          progress: 0,
          started_at: new Date().toISOString(),
          status: 'failed',
          success_count: 0,
          total_registries: 0,
          trigger_source: 'scheduled',
        })
        .execute()

      const result = await getIndexingHistoryHandler(db)

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('failed')
      expect(result[0].errorMessage).toBe(
        'Network error: Failed to fetch registry data',
      )
    })
  })

  describe('concurrent indexing prevention', () => {
    it('should skip indexing if already running', async () => {
      const db = createKysely(env.DB)

      // Set status to 'running'
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: null,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Try to start indexing - this will attempt real network calls
      // but should return early before making them
      const result = await runIndexing(
        env.DB,
        'manual',
        'test-key',
        TEST_ARCHIVE_URL,
      )

      // Should return early with error
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toContain('Indexing already in progress')

      // No new history entry should have been created
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()
      expect(history).toHaveLength(0)
    })

    it('should create history entry when starting indexing', async () => {
      const db = createKysely(env.DB)

      // Ensure status is 'idle'
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: null,
          status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Start indexing (this will make real network calls)
      // We just want to verify it creates a history entry
      const result = await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )

      // Should complete with some success count
      expect(result.success).toBeGreaterThan(0)

      // A history entry should have been created
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()
      expect(history).toHaveLength(1)
      expect(history[0].status).toBe('completed')
      expect(history[0].trigger_source).toBe('scheduled')
    })

    it('should update status to running when indexing starts', async () => {
      const db = createKysely(env.DB)

      // Ensure status is 'idle'
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: null,
          status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Start indexing - we'll check the status during indexing
      const indexingPromise = runIndexing(
        env.DB,
        'manual',
        'test-key',
        TEST_ARCHIVE_URL,
      )

      // Wait a bit for indexing to start
      await new Promise(resolve => setTimeout(resolve, 100))

      // Status should be running or completed (it might be very fast)
      const latestResult = await env.DB
        .prepare('SELECT status FROM indexing_latest ORDER BY updated_at DESC LIMIT 1')
        .first<{ status: string }>()

      expect(latestResult?.status).toMatch(/^(running|completed)$/)

      // Wait for indexing to complete
      await indexingPromise
    })
  })

  describe('stop indexing', () => {
    it('should stop a running indexing job', async () => {
      const db = createKysely(env.DB)

      // Create a running history entry
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, progress, success_count, failed_count, current_step) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'running',
          new Date().toISOString(),
          5,
          2,
          2,
          0,
          'go',
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status to running
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Call stopIndexingHandler
      const result = await stopIndexingHandler(db)

      expect(result.status).toBe('stopped')
      expect(result.message).toBe('Indexing stopped successfully')

      // History entry should be marked as failed
      const history = await db
        .selectFrom('indexing_history')
        .where('id', '=', historyId)
        .selectAll()
        .execute()
      expect(history).toHaveLength(1)
      expect(history[0].status).toBe('failed')
      expect(history[0].error_message).toBe('Indexing was manually stopped')
      expect(history[0].completed_at).not.toBeNull()
      expect(history[0].current_step).toBeNull()

      // Latest status should be failed
      const latestResult = await env.DB
        .prepare('SELECT status FROM indexing_latest ORDER BY updated_at DESC LIMIT 1')
        .first<{ status: string }>()
      expect(latestResult?.status).toBe('failed')
    })

    it('should return not_running status when no job is running', async () => {
      const db = createKysely(env.DB)

      // Ensure status is idle
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: null,
          status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Try to stop when nothing is running
      const result = await stopIndexingHandler(db)

      expect(result.status).toBe('not_running')
      expect(result.message).toBe('No indexing job is currently running')
    })

    it('should return not_running when job is completed', async () => {
      const db = createKysely(env.DB)

      // Create a completed history entry
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, completed_at, total_registries, progress, success_count, failed_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'completed',
          new Date(Date.now() - 10000).toISOString(),
          new Date().toISOString(),
          5,
          100,
          5,
          0,
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status to completed
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Try to stop a completed job
      const result = await stopIndexingHandler(db)

      expect(result.status).toBe('not_running')
      expect(result.message).toBe('No indexing job is currently running')
    })

    it('should allow new indexing after stopping', async () => {
      const db = createKysely(env.DB)

      // Clear any existing history
      await db.deleteFrom('indexing_history').execute()

      // Create a running history entry
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, progress, success_count, failed_count, current_step) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'running',
          new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
          5,
          2,
          2,
          0,
          'go',
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status to running
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Stop the job
      await stopIndexingHandler(db)

      // Verify it was stopped
      const latestResult = await env.DB
        .prepare('SELECT status FROM indexing_latest ORDER BY updated_at DESC LIMIT 1')
        .first<{ status: string }>()
      expect(latestResult?.status).toBe('failed')

      // Now try to start a new indexing job
      // This should succeed because the previous job was stopped
      const result = await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )

      // Should complete without throwing errors
      expect(result).toBeDefined()

      // Should have created a second history entry
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .orderBy('started_at', 'asc')
        .execute()
      expect(history).toHaveLength(2)

      // First entry (oldest) should be the stopped one
      expect(history[0].error_message).toBe('Indexing was manually stopped')
      expect(history[0].status).toBe('failed')

      // Most recent entry should be the new indexing run
      expect(history[1].status).not.toBe('running')
      expect(['completed', 'failed']).toContain(history[1].status)
    })

    it('should preserve trigger_source and created_by when stopping', async () => {
      const db = createKysely(env.DB)

      // Create a running history entry with specific metadata
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, progress, success_count, failed_count, current_step, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'running',
          new Date().toISOString(),
          5,
          2,
          2,
          0,
          'python',
          'a1b2',
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest status
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Stop the job
      await stopIndexingHandler(db)

      // Verify metadata is preserved
      const history = await db
        .selectFrom('indexing_history')
        .where('id', '=', historyId)
        .selectAll()
        .execute()

      expect(history).toHaveLength(1)
      expect(history[0].trigger_source).toBe('manual')
      expect(history[0].created_by).toBe('a1b2')
      expect(history[0].status).toBe('failed')
    })
  })

  describe('progress tracking during bulk write', () => {
    it('should set progress to total_registries after successful completion', async () => {
      const db = createKysely(env.DB)

      const result = await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )

      expect(result.success).toBeGreaterThan(0)

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      expect(history.total_registries).toBeGreaterThan(0)
      expect(history.progress).toBe(100)
    })

    it('should clear current_step after successful completion', async () => {
      const db = createKysely(env.DB)

      await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      expect(history.current_step).toBeNull()
    })

    it('should report progress proportional to bulk write steps', async () => {
      // Verify that the cumulative step weights sum to 100, ensuring
      // progress reaches total_registries at the final step.
      // We test this via the observable outcome: after completion,
      // progress === total_registries (i.e., 100% reached).
      const db = createKysely(env.DB)

      const result = await runIndexing(
        env.DB,
        'manual',
        'test-key',
        TEST_ARCHIVE_URL,
      )

      expect(result.errors).toHaveLength(0)

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      // Progress must have reached 100% — no partial completion
      expect(history.progress).toBe(100)
      expect(history.status).toBe('completed')
    })
  })

  describe('Workflow-based indexing', () => {
    it('should process indexing for manual trigger', async () => {
      const db = createKysely(env.DB)

      const result = await runIndexing(
        env.DB,
        'manual',
        'test-key',
        TEST_ARCHIVE_URL,
      )

      // Verify indexing completed
      expect(result).toBeDefined()
      expect(result.success).toBeGreaterThan(0)

      // Verify history entry was created with correct metadata
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(history).toHaveLength(1)
      expect(history[0].trigger_source).toBe('manual')
      expect(history[0].created_by).toBe('test-key')
      expect(['completed', 'failed']).toContain(history[0].status)
    })

    it('should process indexing for scheduled trigger', async () => {
      const db = createKysely(env.DB)

      const result = await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )

      // Verify indexing completed
      expect(result).toBeDefined()
      expect(result.success).toBeGreaterThan(0)

      // Verify history entry was created with scheduled source
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(history).toHaveLength(1)
      expect(history[0].trigger_source).toBe('scheduled')
      expect(history[0].created_by).toBeNull()
    })

    it('should handle indexing with archiveUrl override', async () => {
      const db = createKysely(env.DB)

      // Create a custom archive URL that will fail (404)
      const customUrl = 'https://example.com/custom-archive.zip'

      // The custom URL will fail (404), but we can verify the structure is processed
      try {
        await runIndexing(
          env.DB,
          'manual',
          'test-admin',
          customUrl,
        )
      } catch (error) {
        // Expected to fail due to invalid URL
        expect(error).toBeDefined()
      }

      // Verify history entry was still created with the attempt
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(history).toHaveLength(1)
      expect(history[0].trigger_source).toBe('manual')
      expect(history[0].created_by).toBe('test-admin')
      expect(history[0].status).toBe('failed')
    })

    it('should process multiple indexing runs sequentially', async () => {
      const db = createKysely(env.DB)

      // Process multiple runs sequentially
      const results = []

      // First run
      const result1 = await runIndexing(
        env.DB,
        'manual',
        'user-1',
        TEST_ARCHIVE_URL,
      )
      results.push(result1)

      // Second run
      const result2 = await runIndexing(
        env.DB,
        'scheduled',
        undefined,
        TEST_ARCHIVE_URL,
      )
      results.push(result2)

      // Verify both completed successfully
      expect(results).toHaveLength(2)
      expect(results[0].success).toBeGreaterThan(0)
      expect(results[1].success).toBeGreaterThan(0)

      // Verify two history entries were created
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .orderBy('started_at', 'asc')
        .execute()

      expect(history).toHaveLength(2)
      expect(history[0].trigger_source).toBe('manual')
      expect(history[0].created_by).toBe('user-1')
      expect(history[1].trigger_source).toBe('scheduled')
      expect(history[1].created_by).toBeNull()
    })

    it('should handle concurrent job prevention', async () => {
      const db = createKysely(env.DB)

      // Create a history entry that's already running (simulating concurrent job)
      const insertResult = await env.DB.prepare(
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, progress, success_count, failed_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'scheduled',
          'running',
          new Date().toISOString(),
          5,
          2,
          2,
          0,
        )
        .run()

      const historyId = insertResult.meta.last_row_id

      // Update latest to running
      await db
        .updateTable('indexing_latest')
        .set({
          history_id: historyId,
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .execute()

      // Try to start a new indexing job while one is running
      const result = await runIndexing(
        env.DB,
        'manual',
        'test-key',
        TEST_ARCHIVE_URL,
      )

      // Should not have started indexing
      expect(result).toBeDefined()
      expect(result.errors).toContain('Indexing already in progress')

      // Verify only the original job exists in history
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .execute()

      expect(history).toHaveLength(1)
      expect(history[0].id).toBe(historyId)
      expect(history[0].status).toBe('running')
    })
  })
})
