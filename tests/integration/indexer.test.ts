import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { env, applyD1Migrations } from 'cloudflare:test'
import { clearDatabase } from '../helpers/db-setup'
import { indexRegistry } from '@/lib/indexer'
import validRegistry from '../fixtures/valid-registry.json'
import minimalRegistry from '../fixtures/minimal-registry.json'
import emptyRegistry from '../fixtures/empty-registry.json'
import type { RegistryData } from '@/types/registry'

describe('Full Indexing Pipeline with D1', () => {
  beforeAll(async () => {
    // Apply migrations once before all tests
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    // Clear database between tests
    // Isolated storage also provides automatic cleanup
    await clearDatabase(env.DB)
  })

  describe('Metadata Operations', () => {
    it('should insert registry metadata', async () => {
      const registryName = 'test-registry'

      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Test Registry', 'A test registry', '2025-10-12T00:00:00Z', 'test/repo', 10, 5000)
        .run()

      const result = await env.DB.prepare(
        'SELECT * FROM registry_metadata WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(result).toBeDefined()
      expect(result!.registry_name).toBe(registryName)
      expect(result!.title).toBe('Test Registry')
      expect(result!.total_items).toBe(10)
      expect(result!.total_stars).toBe(5000)
    })

    it('should delete and re-insert metadata on re-index', async () => {
      const registryName = 'test-registry'

      // First insert
      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Old Title', 'Old description', '2025-10-01T00:00:00Z', 'test/repo', 5, 100)
        .run()

      // Simulate re-indexing: delete and re-insert
      await env.DB.prepare('DELETE FROM registry_metadata WHERE registry_name = ?')
        .bind(registryName)
        .run()

      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'New Title', 'New description', '2025-10-12T00:00:00Z', 'test/repo', 10, 5000)
        .run()

      const result = await env.DB.prepare(
        'SELECT * FROM registry_metadata WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(result).toBeDefined()
      expect(result!.title).toBe('New Title')
      expect(result!.total_items).toBe(10)
    })
  })

  describe('Items Operations', () => {
    it('should insert registry items with repo info', async () => {
      const registryName = 'test-registry'

      // Insert metadata first
      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Test', '', '2025-10-12T00:00:00Z', 'test/repo', 2, 350)
        .run()

      // Insert items using batch
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO registry_items
           (registry_name, category, title, description, repo_owner, repo_name, stars, language, last_commit, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(registryName, 'Testing', 'Vitest', 'Fast unit test framework', 'vitest-dev', 'vitest', 100, 'TypeScript', '2025-10-10T00:00:00Z', 0),
        env.DB.prepare(
          `INSERT INTO registry_items
           (registry_name, category, title, description, repo_owner, repo_name, stars, language, last_commit, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(registryName, 'Testing', 'Playwright', null, 'microsoft', 'playwright', 250, 'TypeScript', '2025-10-11T00:00:00Z', 0),
      ])

      const items = await env.DB.prepare(
        'SELECT * FROM registry_items WHERE registry_name = ? ORDER BY stars DESC',
      )
        .bind(registryName)
        .all()

      expect(items.results).toHaveLength(2)
      expect(items.results[0].title).toBe('Playwright')
      expect(items.results[0].stars).toBe(250)
      expect(items.results[1].title).toBe('Vitest')
      expect(items.results[1].stars).toBe(100)
    })

    it('should handle items without repo info', async () => {
      const registryName = 'test-registry'

      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Test', '', '2025-10-12T00:00:00Z', 'test/repo', 1, 0)
        .run()

      await env.DB.prepare(
        `INSERT INTO registry_items
         (registry_name, category, title, description, repo_owner, repo_name, stars, language, last_commit, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Resources', 'Documentation', 'Official docs', null, null, 0, null, null, 0)
        .run()

      const items = await env.DB.prepare(
        'SELECT * FROM registry_items WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(items.results).toHaveLength(1)
      expect(items.results[0].repo_owner).toBeNull()
      expect(items.results[0].stars).toBe(0)
    })

    it('should handle archived repositories', async () => {
      const registryName = 'test-registry'

      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Test', '', '2025-10-12T00:00:00Z', 'test/repo', 1, 500)
        .run()

      await env.DB.prepare(
        `INSERT INTO registry_items
         (registry_name, category, title, description, repo_owner, repo_name, stars, language, last_commit, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Old', 'Abandoned Project', 'No longer maintained', 'old-org', 'abandoned', 500, null, '2020-01-01T00:00:00Z', 1)
        .run()

      const items = await env.DB.prepare(
        'SELECT * FROM registry_items WHERE archived = 1',
      ).all()

      expect(items.results).toHaveLength(1)
      expect(items.results[0].archived).toBe(1)
    })
  })

  describe('Sync Log', () => {
    it('should record successful sync', async () => {
      const registryName = 'test-registry'

      await env.DB.prepare(
        `INSERT INTO sync_log (registry_name, status, items_synced)
         VALUES (?, ?, ?)`,
      )
        .bind(registryName, 'success', 10)
        .run()

      const logs = await env.DB.prepare(
        'SELECT * FROM sync_log WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(logs.results).toHaveLength(1)
      expect(logs.results[0].status).toBe('success')
      expect(logs.results[0].items_synced).toBe(10)
      expect(logs.results[0].error_message).toBeNull()
    })

    it('should record error with message', async () => {
      const registryName = 'test-registry'
      const errorMsg = 'Failed to parse JSON'

      await env.DB.prepare(
        `INSERT INTO sync_log (registry_name, status, error_message)
         VALUES (?, ?, ?)`,
      )
        .bind(registryName, 'error', errorMsg)
        .run()

      const logs = await env.DB.prepare(
        "SELECT * FROM sync_log WHERE status = 'error'",
      ).all()

      expect(logs.results).toHaveLength(1)
      expect(logs.results[0].error_message).toBe(errorMsg)
    })
  })

  describe('Full Indexing with Fixtures', () => {
    it('should index valid registry fixture', async () => {
      const registryName = 'valid-registry'
      const data = validRegistry as RegistryData

      await indexRegistry(env.DB, registryName, data)

      // Verify metadata
      const metadata = await env.DB.prepare(
        'SELECT * FROM registry_metadata WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(metadata).toBeDefined()
      expect(metadata!.title).toBe('Awesome Test Registry')
      expect(metadata!.total_items).toBe(4)
      expect(metadata!.total_stars).toBe(70100) // 15000+50000+5000+100

      // Verify items
      const items = await env.DB.prepare(
        'SELECT * FROM registry_items WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(items.results).toHaveLength(4)

      const archivedItems = items.results.filter((item) => item.archived === 1)
      expect(archivedItems).toHaveLength(1)
      expect(archivedItems[0].title).toBe('Archived Project')

      // Verify sync log
      const syncLogs = await env.DB.prepare(
        'SELECT * FROM sync_log WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(syncLogs.results).toHaveLength(1)
      expect(syncLogs.results[0].status).toBe('success')
      expect(syncLogs.results[0].items_synced).toBe(4)
    })

    it('should index minimal registry fixture', async () => {
      const registryName = 'minimal-registry'
      const data = minimalRegistry as RegistryData

      await indexRegistry(env.DB, registryName, data)

      const metadata = await env.DB.prepare(
        'SELECT * FROM registry_metadata WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(metadata).toBeDefined()
      expect(metadata!.total_items).toBe(2)
      expect(metadata!.total_stars).toBe(0)

      const items = await env.DB.prepare(
        'SELECT * FROM registry_items WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(items.results).toHaveLength(2)
      expect(items.results.every((item) => item.repo_owner === null)).toBe(true)
    })

    it('should index empty registry fixture', async () => {
      const registryName = 'empty-registry'
      const data = emptyRegistry as RegistryData

      await indexRegistry(env.DB, registryName, data)

      const metadata = await env.DB.prepare(
        'SELECT * FROM registry_metadata WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(metadata!.total_items).toBe(0)
      expect(metadata!.total_stars).toBe(0)

      const items = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM registry_items WHERE registry_name = ?',
      )
        .bind(registryName)
        .first()

      expect(items!.count).toBe(0)
    })
  })
})
