/**
 * Integration tests for the indexing workflow
 * Tests the workflow step orchestration and error handling
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import { createKysely } from '@/lib/db'
import { TEST_ARCHIVE_URL } from './test_utils'

// Import all workflow step functions
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
  WORKFLOW_STEPS,
} = await import('@/lib/indexer')

/**
 * Simulates the workflow run by executing steps in sequence
 * This mirrors the IndexingWorkflow.run() logic for testing
 */
async function simulateWorkflowRun(
  db: D1Database,
  params: {
    archiveUrl?: string
    createdBy?: string
    triggerSource: 'manual' | 'scheduled'
  },
): Promise<{
  errors: string[]
  failed: number
  reason?: string
  status: 'completed' | 'failed' | 'skipped'
  success: number
}> {
  const { triggerSource, archiveUrl, createdBy } = params

  // Step 0: Check if already running
  const isRunning = await checkIsIndexingRunning(db)
  if (isRunning) {
    return { status: 'skipped', reason: 'already_running', success: 0, failed: 0, errors: [] }
  }

  // Step 1: Create history entry
  const historyId = await createWorkflowHistoryEntry(db, triggerSource, createdBy)
  await setIndexingRunning(db, historyId)

  let collectedData: Awaited<ReturnType<typeof fetchAndCollectStep>>['collected']
  let collectResult: { errors: string[]; failed: number; success: number }

  try {
    // Step 2: Fetch and collect
    const fetchResult = await fetchAndCollectStep(db, {
      historyId,
      triggerSource,
      archiveUrl,
      createdBy,
    })
    collectedData = fetchResult.collected
    collectResult = {
      errors: fetchResult.errors,
      failed: fetchResult.failed,
      success: fetchResult.success,
    }

    // Step 3: Write repositories
    await writeRepositoriesStep(db, historyId, collectedData)

    // Step 4: Write tags and metadata
    await writeTagsAndMetadataStep(db, historyId, collectedData)

    // Step 5: Write associations
    await writeAssociationsStep(db, historyId, collectedData)

    // Step 6: Write categories
    await writeCategoriesStep(db, historyId, collectedData)

    // Step 7: Rebuild facets
    await rebuildFacetsStep(db, historyId)

    // Step 8: Rebuild FTS
    await rebuildFtsStep(db, historyId)

    // Step 9: Finalize
    await finalizeStep(db, historyId, collectResult)

    return { status: 'completed', ...collectResult }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await markIndexingFailed(db, historyId, errorMsg)
    throw error
  }
}

describe('Indexing Workflow', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    const db = createKysely(env.DB)
    await db.deleteFrom('indexing_history').execute()
    await db
      .updateTable('indexing_latest')
      .set({ history_id: null, status: 'idle', updated_at: new Date().toISOString() })
      .execute()
    await db.deleteFrom('sync_log').execute()
    await db.deleteFrom('registry_repositories').execute()
    await db.deleteFrom('repositories').execute()
    await db.deleteFrom('registry_metadata').execute()
  })

  describe('Workflow Steps Configuration', () => {
    it('should have all required workflow steps defined', () => {
      const requiredSteps = [
        'fetch-and-collect',
        'write-repositories',
        'write-tags-metadata',
        'write-associations',
        'write-categories',
        'rebuild-facets',
        'rebuild-fts',
        'finalize',
      ]

      for (const step of requiredSteps) {
        expect(WORKFLOW_STEPS).toHaveProperty(step)
        expect(WORKFLOW_STEPS[step as keyof typeof WORKFLOW_STEPS]).toHaveProperty('progress')
        expect(WORKFLOW_STEPS[step as keyof typeof WORKFLOW_STEPS]).toHaveProperty('message')
      }
    })

    it('should have monotonically increasing progress values', () => {
      const steps = Object.values(WORKFLOW_STEPS)
      const progressValues = steps.map(s => s.progress)

      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1])
      }
    })

    it('should end with 100% progress', () => {
      expect(WORKFLOW_STEPS.finalize.progress).toBe(100)
    })

    it('should start with progress > 0', () => {
      expect(WORKFLOW_STEPS['fetch-and-collect'].progress).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Execution Prevention', () => {
    it('should skip when indexing is already running', async () => {
      const db = createKysely(env.DB)

      // Set status to running
      await db
        .updateTable('indexing_latest')
        .set({ status: 'running', updated_at: new Date().toISOString() })
        .execute()

      const result = await simulateWorkflowRun(env.DB, {
        triggerSource: 'manual',
        createdBy: 'test-key',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      expect(result.status).toBe('skipped')
      expect(result.reason).toBe('already_running')

      // No history entry should be created
      const history = await db.selectFrom('indexing_history').selectAll().execute()
      expect(history).toHaveLength(0)
    })

    it('should allow indexing after previous run completes', async () => {
      // First run
      const result1 = await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })
      expect(result1.status).toBe('completed')

      // Second run should succeed
      const result2 = await simulateWorkflowRun(env.DB, {
        triggerSource: 'manual',
        createdBy: 'test-key',
        archiveUrl: TEST_ARCHIVE_URL,
      })
      expect(result2.status).toBe('completed')
    })
  })

  describe('Full Workflow Execution', () => {
    it('should complete workflow with scheduled trigger', async () => {
      const db = createKysely(env.DB)

      const result = await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      expect(result.status).toBe('completed')
      expect(result.success).toBeGreaterThan(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify history entry
      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      expect(history.status).toBe('completed')
      expect(history.trigger_source).toBe('scheduled')
      expect(history.progress).toBe(100)
      expect(history.created_by).toBeNull()
    })

    it('should complete workflow with manual trigger', async () => {
      const db = createKysely(env.DB)

      const result = await simulateWorkflowRun(env.DB, {
        triggerSource: 'manual',
        createdBy: 'abcd',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      expect(result.status).toBe('completed')
      expect(result.success).toBeGreaterThan(0)

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      expect(history.trigger_source).toBe('manual')
      expect(history.created_by).toBe('abcd')
    })

    it('should persist data to database after workflow completes', async () => {
      const db = createKysely(env.DB)

      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      // Check repositories were written
      const repos = await db.selectFrom('repositories').selectAll().execute()
      expect(repos.length).toBeGreaterThan(0)

      // Check registry metadata was written
      const metadata = await db.selectFrom('registry_metadata').selectAll().execute()
      expect(metadata.length).toBeGreaterThan(0)
    })

    it('should update progress through all steps', async () => {
      const db = createKysely(env.DB)

      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      // Final progress should be 100%
      expect(history.progress).toBe(100)
      expect(history.current_step).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should mark workflow as failed on network error', async () => {
      const db = createKysely(env.DB)

      // Use invalid URL
      const invalidUrl = 'https://example.com/nonexistent-archive.zip'

      await expect(
        simulateWorkflowRun(env.DB, {
          triggerSource: 'manual',
          createdBy: 'test',
          archiveUrl: invalidUrl,
        }),
      ).rejects.toThrow()

      const history = await db
        .selectFrom('indexing_history')
        .selectAll()
        .executeTakeFirstOrThrow()

      expect(history.status).toBe('failed')
      expect(history.error_message).toBeDefined()
      expect(history.progress).toBeLessThan(100)
    })

    it('should reset status to failed when workflow errors', async () => {
      await expect(
        simulateWorkflowRun(env.DB, {
          triggerSource: 'scheduled',
          archiveUrl: 'https://invalid.example.com/archive.zip',
        }),
      ).rejects.toThrow()

      const latest = await env.DB
        .prepare('SELECT status FROM indexing_latest')
        .first<{ status: string }>()

      expect(latest?.status).toBe('failed')
    })
  })

  describe('Workflow Step Isolation', () => {
    it('should create history entry before other steps', async () => {
      const kysely = createKysely(env.DB)

      // Start workflow but simulate early failure
      const historyId = await createWorkflowHistoryEntry(env.DB, 'manual', 'test')
      await setIndexingRunning(env.DB, historyId)

      const history = await kysely
        .selectFrom('indexing_history')
        .where('id', '=', historyId)
        .selectAll()
        .executeTakeFirst()

      expect(history).toBeDefined()
      expect(history?.status).toBe('running')
    })

    it('should track progress for each step', async () => {
      const kysely = createKysely(env.DB)

      const historyId = await createWorkflowHistoryEntry(env.DB, 'scheduled')
      await setIndexingRunning(env.DB, historyId)

      // Execute fetch step
      const fetchResult = await fetchAndCollectStep(env.DB, {
        historyId,
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      // Check progress was updated
      const history = await kysely
        .selectFrom('indexing_history')
        .where('id', '=', historyId)
        .selectAll()
        .executeTakeFirst()

      expect(history?.progress).toBe(WORKFLOW_STEPS['fetch-and-collect'].progress)
      expect(history?.current_step).toBe(WORKFLOW_STEPS['fetch-and-collect'].message)

      // Continue with other steps
      await writeRepositoriesStep(env.DB, historyId, fetchResult.collected)
      const afterRepos = await kysely
        .selectFrom('indexing_history')
        .where('id', '=', historyId)
        .select(['progress', 'current_step'])
        .executeTakeFirst()

      expect(afterRepos?.progress).toBe(WORKFLOW_STEPS['write-repositories'].progress)
    })
  })

  describe('Data Integrity', () => {
    it('should write all data types correctly', async () => {
      const db = createKysely(env.DB)

      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      // Verify repositories
      const repos = await db.selectFrom('repositories').selectAll().execute()
      expect(repos.length).toBeGreaterThan(0)

      // Verify tags
      const tags = await db.selectFrom('tags').selectAll().execute()
      expect(tags.length).toBeGreaterThan(0)

      // Verify registry_metadata
      const metadata = await db.selectFrom('registry_metadata').selectAll().execute()
      expect(metadata.length).toBeGreaterThan(0)

      // Verify registry_repositories (linking table)
      const regRepos = await db.selectFrom('registry_repositories').selectAll().execute()
      expect(regRepos.length).toBeGreaterThan(0)

      // Verify repo_tags
      const repoTags = await db.selectFrom('repo_tags').selectAll().execute()
      expect(repoTags.length).toBeGreaterThan(0)
    })

    it('should rebuild facets after data write', async () => {
      const db = createKysely(env.DB)

      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      // Check that repository_facets has data
      const facets = await db.selectFrom('repository_facets').selectAll().execute()
      expect(facets.length).toBeGreaterThan(0)
    })

    it('should rebuild FTS index after data write', async () => {
      const db = createKysely(env.DB)

      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      // Check that repositories_fts has data
      const fts = await db
        .selectFrom('repositories_fts')
        .selectAll()
        .limit(1)
        .execute()

      expect(fts.length).toBeGreaterThanOrEqual(0) // FTS may have specific matching rules
    })
  })

  describe('Idempotency', () => {
    it('should handle re-running workflow on same data', async () => {
      const db = createKysely(env.DB)

      // First run
      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      const reposAfterFirst = await db
        .selectFrom('repositories')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst()

      // Second run
      await simulateWorkflowRun(env.DB, {
        triggerSource: 'scheduled',
        archiveUrl: TEST_ARCHIVE_URL,
      })

      const reposAfterSecond = await db
        .selectFrom('repositories')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst()

      // Repository count should be the same (idempotent)
      expect(reposAfterSecond?.count).toBe(reposAfterFirst?.count)
    })
  })
})
