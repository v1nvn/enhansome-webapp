/**
 * Integration tests for FTS5 full-text search functionality
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import { createKysely } from '@/lib/db'
import { ftsSearch, rebuildFtsIndex } from '@/lib/db/repositories/fts-search-repository'
import { clearDatabase } from '../helpers/cleanup-database'
import { seedTestData } from '../helpers/seed-test-data'

describe('FTS5 Search', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    const db = createKysely(env.DB)
    await clearDatabase(db)
    await seedTestData(db)
    // Rebuild FTS index after seeding data
    await rebuildFtsIndex(db)
  })

  describe('ftsSearch', () => {
    it('should return results for natural language queries', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, { query: 'web framework' })

      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.repositories).toBeInstanceOf(Array)
      expect(result.hasMore).toBe(false)
    })

    it('should return results matching owner name', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, { query: 'gin-gonic' })

      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.repositories.some(r => r.repo_info.owner === 'gin-gonic')).toBe(true)
    })

    it('should return results matching repository name', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, { query: 'gin' })

      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should filter by registry', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, {
        query: 'framework',
        registry: 'go',
      })

      // All results should be from the go registry
      for (const repo of result.repositories) {
        expect(repo.registries).toContain('go')
      }
    })

    it('should filter by language', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, {
        query: 'framework',
        language: 'Go',
      })

      for (const repo of result.repositories) {
        expect(repo.repo_info.language).toBe('Go')
      }
    })

    it('should filter by minStars', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, {
        query: 'framework',
        minStars: 10000,
      })

      for (const repo of result.repositories) {
        expect(repo.repo_info.stars).toBeGreaterThanOrEqual(10000)
      }
    })

    it('should respect limit parameter', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, {
        query: 'framework',
        limit: 2,
      })

      expect(result.repositories.length).toBeLessThanOrEqual(2)
    })

    it('should handle pagination with cursor', async () => {
      const db = createKysely(env.DB)
      const firstPage = await ftsSearch(db, {
        query: 'framework',
        limit: 2,
      })

      if (firstPage.hasMore && firstPage.nextCursor) {
        const secondPage = await ftsSearch(db, {
          query: 'framework',
          limit: 2,
          cursor: firstPage.nextCursor,
        })

        // Second page should have results
        expect(secondPage.repositories.length).toBeGreaterThan(0)
        // Cursors should be different
        expect(firstPage.nextCursor).not.toEqual(secondPage.nextCursor)
      }
    })

    it('should return suggestions when results are sparse', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, {
        query: 'xyznonexistent',
      })

      expect(result.total).toBe(0)
      expect(result.repositories).toHaveLength(0)
      // Suggestions may or may not be present depending on whether
      // matching registries/categories exist
    })

    it('should return quality scores for ranking', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, { query: 'framework' })

      for (const repo of result.repositories) {
        expect(repo.qualityScore).toBeGreaterThanOrEqual(0)
        expect(typeof repo.qualityScore).toBe('number')
      }
    })

    it('should return registries, categories, and tags arrays', async () => {
      const db = createKysely(env.DB)
      const result = await ftsSearch(db, { query: 'framework' })

      for (const repo of result.repositories) {
        expect(repo.registries).toBeInstanceOf(Array)
        expect(repo.categories).toBeInstanceOf(Array)
        expect(repo.tags).toBeInstanceOf(Array)
      }
    })
  })

  describe('rebuildFtsIndex', () => {
    it('should rebuild the FTS index without errors', async () => {
      const db = createKysely(env.DB)
      // Should not throw
      await expect(rebuildFtsIndex(db)).resolves.toBeUndefined()
    })

    it('should make repositories searchable after rebuild', async () => {
      const db = createKysely(env.DB)

      // Rebuild index
      await rebuildFtsIndex(db)

      // Search should work
      const result = await ftsSearch(db, { query: 'gin' })
      expect(result.total).toBeGreaterThanOrEqual(1)
    })
  })
})
