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
} from '@/lib/server-functions'

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
    await db.deleteFrom('registry_items').execute()
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
        'processed_registries',
        'current_registry',
        'success_count',
        'failed_count',
        'errors',
        'error_message',
        'created_by',
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

      // Note: We can't easily test the full indexAllRegistries flow in tests
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
          processed_registries: 0,
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
        'SELECT * FROM indexing_latest WHERE id = 1',
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
        'SELECT * FROM indexing_latest WHERE id = 1',
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
        'INSERT INTO indexing_history (trigger_source, status, started_at, completed_at, total_registries, processed_registries, success_count, failed_count, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          'manual',
          'completed',
          new Date(Date.now() - 10000).toISOString(),
          new Date().toISOString(),
          5,
          5,
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
        'INSERT INTO indexing_history (trigger_source, status, started_at, total_registries, processed_registries, success_count, failed_count, current_registry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
      expect(result.current?.currentRegistry).toBe('go')
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
            processed_registries: 5,
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
            processed_registries: 5,
            started_at: new Date(now - 2000).toISOString(),
            status: 'completed',
            success_count: 5,
            total_registries: 5,
            trigger_source: 'manual',
          },
          {
            completed_at: new Date(now - 7000).toISOString(),
            failed_count: 0,
            processed_registries: 5,
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
          processed_registries: 5,
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
        processedRegistries: 5,
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
            processed_registries: 5,
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
          processed_registries: 5,
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
          processed_registries: 5,
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
          processed_registries: 0,
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

      // Import the indexer module
      const indexerModule = await import('@/lib/indexer')

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
      const result = await indexerModule.indexAllRegistries(
        env.DB,
        'manual',
        'test-key',
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

      // Import the indexer module
      const indexerModule = await import('@/lib/indexer')

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
      const result = await indexerModule.indexAllRegistries(env.DB, 'scheduled')

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

      // Import the indexer module
      const indexerModule = await import('@/lib/indexer')

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
      const indexingPromise = indexerModule.indexAllRegistries(
        env.DB,
        'manual',
        'test-key',
      )

      // Wait a bit for indexing to start
      await new Promise(resolve => setTimeout(resolve, 100))

      // Status should be running or completed (it might be very fast)
      const latestResult = await env.DB
        .prepare('SELECT status FROM indexing_latest WHERE id = 1')
        .first<{ status: string }>()

      expect(latestResult?.status).toMatch(/^(running|completed)$/)

      // Wait for indexing to complete
      await indexingPromise
    })
  })
})
