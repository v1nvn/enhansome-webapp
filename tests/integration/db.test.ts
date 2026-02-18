/**
 * Integration tests for database query functions
 * Tests all the database query functions used by the application
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import {
  createKysely,
  getCategorySummaries,
  getFeaturedRegistries,
  getLanguages,
  getRegistryData,
  getRegistryDetail,
  getRegistryMetadata,
  getRegistryStats,
  getRepoDetail,
  getTrendingRegistries,
  searchRegistryItems,
} from '@/lib/db'

describe('Database Query Functions', () => {
  beforeAll(async () => {
    // Apply migrations
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    // Clear and seed test data
    const db = createKysely(env.DB)

    // Clear existing data
    await db.deleteFrom('registry_items').execute()
    await db.deleteFrom('registry_metadata').execute()
    await db.deleteFrom('registry_featured').execute()

    // Insert registry metadata
    await db
      .insertInto('registry_metadata')
      .values([
        {
          registry_name: 'go',
          title: 'Awesome Go',
          description: 'Go frameworks and libraries',
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'avelino/awesome-go',
          total_items: 3,
          total_stars: 60000,
        },
        {
          registry_name: 'python',
          title: 'Awesome Python',
          description: 'Python libraries',
          last_updated: '2025-10-11T00:00:00Z',
          source_repository: 'vinta/awesome-python',
          total_items: 2,
          total_stars: 30000,
        },
      ])
      .execute()

    // Insert registry items
    await db
      .insertInto('registry_items')
      .values([
        {
          registry_name: 'go',
          category: 'Web Frameworks',
          title: 'Gin',
          description: 'HTTP web framework',
          repo_owner: 'gin-gonic',
          repo_name: 'gin',
          stars: 50000,
          language: 'Go',
          last_commit: '2025-10-10T00:00:00Z',
          archived: 0,
        },
        {
          registry_name: 'go',
          category: 'Web Frameworks',
          title: 'Echo',
          description: 'High performance framework',
          repo_owner: 'labstack',
          repo_name: 'echo',
          stars: 8000,
          language: 'Go',
          last_commit: '2025-10-09T00:00:00Z',
          archived: 0,
        },
        {
          registry_name: 'go',
          category: 'Testing',
          title: 'Testify',
          description: 'Testing toolkit',
          repo_owner: 'stretchr',
          repo_name: 'testify',
          stars: 2000,
          language: 'Go',
          last_commit: '2025-10-08T00:00:00Z',
          archived: 0,
        },
        {
          registry_name: 'python',
          category: 'Web Frameworks',
          title: 'Django',
          description: 'Web framework',
          repo_owner: 'django',
          repo_name: 'django',
          stars: 20000,
          language: 'Python',
          last_commit: '2025-10-07T00:00:00Z',
          archived: 0,
        },
        {
          registry_name: 'python',
          category: 'Web Frameworks',
          title: 'Flask',
          description: 'Micro framework',
          repo_owner: 'pallets',
          repo_name: 'flask',
          stars: 10000,
          language: 'Python',
          last_commit: '2025-10-06T00:00:00Z',
          archived: 1,
        },
      ])
      .execute()

    // Insert featured registries
    await db
      .insertInto('registry_featured')
      .values([
        {
          registry_name: 'go',
          featured: 1,
          featured_order: 1,
          editorial_badge: 'editors-choice',
        },
        {
          registry_name: 'python',
          featured: 1,
          featured_order: 2,
          editorial_badge: 'trending',
        },
      ])
      .execute()
  })

  describe('getRegistryMetadata', () => {
    it('should return all registry metadata', async () => {
      const db = createKysely(env.DB)
      const metadata = await getRegistryMetadata(db)

      expect(metadata).toHaveLength(2)

      // Check Go registry
      const goRegistry = metadata.find(r => r.registry_name === 'go')
      expect(goRegistry).toBeDefined()
      expect(goRegistry?.title).toBe('Awesome Go')
      expect(goRegistry?.description).toBe('Go frameworks and libraries')
      expect(goRegistry?.total_items).toBe(3)
      expect(goRegistry?.total_stars).toBe(60000)

      // Check Python registry
      const pythonRegistry = metadata.find(r => r.registry_name === 'python')
      expect(pythonRegistry).toBeDefined()
      expect(pythonRegistry?.total_items).toBe(2)
    })

    it('should return empty array for empty database', async () => {
      const db = createKysely(env.DB)
      // Need to delete in order due to foreign key constraints
      await db.deleteFrom('registry_featured').execute()
      await db.deleteFrom('registry_items').execute()
      await db.deleteFrom('registry_metadata').execute()

      const metadata = await getRegistryMetadata(db)
      expect(metadata).toHaveLength(0)
    })
  })

  describe('getRegistryData', () => {
    it('should return full registry data grouped by categories', async () => {
      const db = createKysely(env.DB)
      const data = await getRegistryData(db, 'go')

      expect(data.metadata.title).toBe('Awesome Go')
      expect(data.metadata.last_updated).toBe('2025-10-12T00:00:00Z')
      expect(data.metadata.source_repository).toBe('avelino/awesome-go')

      expect(data.items).toHaveLength(2) // 2 categories

      const webFrameworks = data.items.find(cat => cat.title === 'Web Frameworks')
      expect(webFrameworks).toBeDefined()
      expect(webFrameworks!.items).toHaveLength(2)
      expect(webFrameworks!.items[0].title).toBe('Gin')
      expect(webFrameworks!.items[0].repo_info?.stars).toBe(50000)

      const testing = data.items.find(cat => cat.title === 'Testing')
      expect(testing).toBeDefined()
      expect(testing!.items).toHaveLength(1)
    })

    it('should throw error for non-existent registry', async () => {
      const db = createKysely(env.DB)
      await expect(getRegistryData(db, 'nonexistent')).rejects.toThrow(
        'Registry not found: nonexistent',
      )
    })

    it('should handle items without repo info', async () => {
      const db = createKysely(env.DB)

      // Add item without repo info
      await db
        .insertInto('registry_items')
        .values({
          registry_name: 'go',
          category: 'Documentation',
          title: 'Docs',
          description: 'Documentation',
          repo_owner: null,
          repo_name: null,
          stars: 0,
          language: null,
          last_commit: null,
          archived: 0,
        })
        .execute()

      const data = await getRegistryData(db, 'go')
      const docsCategory = data.items.find(cat => cat.title === 'Documentation')
      expect(docsCategory).toBeDefined()
      expect(docsCategory!.items[0].repo_info).toBeUndefined()
    })
  })

  describe('getRegistryStats', () => {
    it('should calculate registry stats correctly', async () => {
      const db = createKysely(env.DB)
      const stats = await getRegistryStats(db, 'go')

      expect(stats.totalRepos).toBe(3)
      expect(stats.totalStars).toBe(60000)
      expect(stats.languages).toContain('Go')
      expect(stats.latestUpdate).toBe('2025-10-12T00:00:00Z') // From registry_metadata.last_updated
    })

    it('should handle registry with no items', async () => {
      const db = createKysely(env.DB)

      // Insert empty registry
      await db
        .insertInto('registry_metadata')
        .values({
          registry_name: 'empty',
          title: 'Empty Registry',
          description: 'Empty',
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/empty',
          total_items: 0,
          total_stars: 0,
        })
        .execute()

      const stats = await getRegistryStats(db, 'empty')

      expect(stats.totalRepos).toBe(0)
      expect(stats.totalStars).toBe(0)
      expect(stats.languages).toHaveLength(0)
      expect(stats.latestUpdate).toBe('2025-10-12T00:00:00Z')
    })

    it('should handle non-existent registry', async () => {
      const db = createKysely(env.DB)
      const stats = await getRegistryStats(db, 'nonexistent')

      expect(stats.totalRepos).toBe(0)
      expect(stats.totalStars).toBe(0)
      expect(stats.latestUpdate).toBe('')
      expect(stats.languages).toHaveLength(0)
    })
  })

  describe('getLanguages', () => {
    it('should return all unique languages', async () => {
      const db = createKysely(env.DB)
      const languages = await getLanguages(db)

      expect(languages).toHaveLength(2)
      expect(languages).toContain('Go')
      expect(languages).toContain('Python')
    })

    it('should filter languages by registry', async () => {
      const db = createKysely(env.DB)
      const languages = await getLanguages(db, 'go')

      expect(languages).toHaveLength(1)
      expect(languages).toContain('Go')
    })

    it('should return empty array for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const languages = await getLanguages(db, 'nonexistent')

      expect(languages).toHaveLength(0)
    })

    it('should return empty array for empty database', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_items').execute()

      const languages = await getLanguages(db)
      expect(languages).toHaveLength(0)
    })
  })

  describe('Categories Query', () => {
    it('should return all categories with counts', async () => {
      const db = createKysely(env.DB)

      const categories = await db
        .selectFrom('registry_items')
        .select([
          'registry_name',
          'category',
          db.fn.count<number>('id').as('count'),
        ])
        .groupBy(['registry_name', 'category'])
        .orderBy('category', 'asc')
        .execute()

      expect(categories.length).toBeGreaterThanOrEqual(2)

      // Check Web Frameworks for Go
      const goWebFrameworks = categories.find(
        c => c.registry_name === 'go' && c.category === 'Web Frameworks',
      )
      expect(goWebFrameworks).toBeDefined()
      expect(goWebFrameworks?.count).toBe(2)

      // Check Testing for Go
      const goTesting = categories.find(
        c => c.registry_name === 'go' && c.category === 'Testing',
      )
      expect(goTesting).toBeDefined()
      expect(goTesting?.count).toBe(1)
    })

    it('should filter categories by registry', async () => {
      const db = createKysely(env.DB)

      const categories = await db
        .selectFrom('registry_items')
        .select(['registry_name', 'category', db.fn.count<number>('id').as('count')])
        .where('registry_name', '=', 'python')
        .groupBy(['registry_name', 'category'])
        .execute()

      expect(categories.every(c => c.registry_name === 'python')).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })
  })

  describe('searchRegistryItems', () => {
    it('should return all items without filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {})

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(5)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
      expect(result.data[0]).toHaveProperty('id')
    })

    it('should filter by registry', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { registryName: 'go' })

      expect(result.total).toBe(3)
      expect(result.data.every(item => item.registry === 'go')).toBe(true)
    })

    it('should filter by language', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { language: 'Python' })

      expect(result.total).toBe(2)
      expect(
        result.data.every(item => item.repo_info?.language === 'Python'),
      ).toBe(true)
    })

    it('should filter by minimum stars', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { minStars: 10000 })

      expect(result.total).toBe(3) // Gin (50000), Django (20000), Flask (10000)
      expect(
        result.data.every(item => (item.repo_info?.stars || 0) >= 10000),
      ).toBe(true)
    })

    it('should filter by archived status', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { archived: false })

      expect(result.total).toBe(4) // All except Flask
      expect(
        result.data
          .filter(item => item.repo_info)
          .every(item => item.repo_info?.archived === false),
      ).toBe(true)
    })

    it('should search by text query', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { q: 'framework' })

      expect(result.total).toBeGreaterThan(0)
      expect(
        result.data.every(
          item =>
            item.title.toLowerCase().includes('framework') ||
            item.description?.toLowerCase().includes('framework'),
        ),
      ).toBe(true)
    })

    it('should escape SQL special characters in search query', async () => {
      const db = createKysely(env.DB)

      // Test with SQL LIKE wildcards that should be escaped
      const result1 = await searchRegistryItems(db, { q: 'test%' })
      // Should not match everything due to % wildcard
      expect(result1.total).toBe(0) // No items have literal "test%" in them

      const result2 = await searchRegistryItems(db, { q: 'test_' })
      // Should not act as wildcard
      expect(result2.total).toBe(0)

      const result3 = await searchRegistryItems(db, { q: 'test\\' })
      // Should handle backslash without errors
      expect(result3.total).toBe(0)
    })

    it('should sort by stars descending by default', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {})

      // First item should be Gin (50000 stars)
      expect(result.data[0]?.title).toBe('Gin')
      expect(result.data[0]?.repo_info?.stars).toBe(50000)
    })

    it('should sort by name ascending', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { sortBy: 'name' })

      // Should be alphabetically sorted
      const titles = result.data.map(item => item.title)
      expect(titles[0]).toBe('Django')
    })

    it('should handle cursor-based pagination', async () => {
      const db = createKysely(env.DB)
      const result1 = await searchRegistryItems(db, { limit: 2 })

      expect(result1.total).toBe(5)
      expect(result1.data).toHaveLength(2)
      expect(result1.hasMore).toBe(true)
      expect(result1.nextCursor).toBeDefined()

      // Fetch next page using cursor
      const result2 = await searchRegistryItems(db, {
        limit: 2,
        cursor: result1.nextCursor,
      })

      expect(result2.total).toBe(5)
      // Second page should have 2 items (items 3 and 4)
      expect(result2.data.length).toBeGreaterThan(0)
      expect(result2.data.length).toBeLessThanOrEqual(2)

      // Ensure no overlap - all IDs in result2 should be greater than in result1
      const allIds1 = result1.data.map(item => item.id)
      const allIds2 = result2.data.map(item => item.id)
      expect(Math.min(...allIds2)).toBeGreaterThan(Math.max(...allIds1))
    })

    it('should combine multiple filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        language: 'Go',
        minStars: 5000,
        registryName: 'go',
      })

      expect(result.total).toBe(2) // Gin and Echo
      expect(result.data.every(item => item.registry === 'go')).toBe(true)
      expect(
        result.data.every(item => item.repo_info?.language === 'Go'),
      ).toBe(true)
      expect(
        result.data.every(item => (item.repo_info?.stars || 0) >= 5000),
      ).toBe(true)
    })

    // Negative tests
    it('should return empty results for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        registryName: 'nonexistent',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle query with no matches', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        q: 'nonexistentlibrary12345',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle language with no matches', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { language: 'Rust' })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle minStars filtering out all items', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { minStars: 100000 })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle archived items correctly', async () => {
      const db = createKysely(env.DB)

      // Only archived items
      const archivedResult = await searchRegistryItems(db, { archived: true })
      expect(archivedResult.total).toBe(1)
      expect(archivedResult.data[0]?.title).toBe('Flask')

      // Only non-archived items
      const activeResult = await searchRegistryItems(db, { archived: false })
      expect(activeResult.total).toBe(4)
    })

    // Edge cases
    it('should handle cursor beyond results', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        limit: 10,
        cursor: 99999, // Very high cursor value
      })

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
    })

    it('should handle very large limit values', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { limit: 1000 })

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(5)
      expect(result.hasMore).toBe(false)
    })

    it('should handle zero stars filter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { minStars: 0 })

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(5)
    })

    it('should handle case-insensitive search', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { q: 'FRAMEWORK' })

      expect(result.total).toBeGreaterThan(0)
      expect(
        result.data.some(
          item =>
            item.title.toLowerCase().includes('framework') ||
            item.description?.toLowerCase().includes('framework'),
        ),
      ).toBe(true)
    })

    it('should handle negative minStars values', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, { minStars: -100 })

      // Should treat as 0 or return all items
      expect(result.total).toBe(5)
    })

    it('should filter by category', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        category: 'Web Frameworks',
      })

      expect(result.total).toBe(4) // 2 from go, 2 from python
      expect(result.data.every(item => item.category === 'Web Frameworks')).toBe(
        true,
      )
    })

    it('should filter by category and registry together', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        registryName: 'go',
        category: 'Web Frameworks',
      })

      expect(result.total).toBe(2) // Gin and Echo
      expect(result.data.every(item => item.registry === 'go')).toBe(true)
      expect(result.data.every(item => item.category === 'Web Frameworks')).toBe(
        true,
      )
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      const db = createKysely(env.DB)

      // Clear all data in correct order due to foreign key constraints
      await db.deleteFrom('registry_featured').execute()
      await db.deleteFrom('registry_items').execute()
      await db.deleteFrom('registry_metadata').execute()

      const metadata = await getRegistryMetadata(db)
      expect(metadata).toHaveLength(0)

      const languages = await getLanguages(db)
      expect(languages).toHaveLength(0)

      const searchResult = await searchRegistryItems(db, {})
      expect(searchResult.total).toBe(0)
      expect(searchResult.data).toHaveLength(0)
    })

    it('should handle special characters in search query', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItems(db, {
        q: 'test@#$%^&*()',
      })

      // Should not crash, just return no results
      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle very long search queries', async () => {
      const db = createKysely(env.DB)
      const longQuery = 'a'.repeat(1000)

      // Very long queries cause SQLite LIKE pattern complexity errors
      // This is expected behavior - test that it throws
      await expect(
        searchRegistryItems(db, { q: longQuery }),
      ).rejects.toThrow()
    })
  })

  describe('getCategorySummaries', () => {
    it('should return category summaries with counts', async () => {
      const db = createKysely(env.DB)
      const summaries = await getCategorySummaries(db)

      expect(summaries.length).toBeGreaterThan(0)

      // Check Web Frameworks category (should have 4 items: Gin, Echo, Django, Flask)
      const webFrameworks = summaries.find(s => s.category === 'Web Frameworks')
      expect(webFrameworks).toBeDefined()
      expect(webFrameworks?.count).toBe(4)
      expect(webFrameworks?.totalStars).toBe(88000) // 50000 + 8000 + 20000 + 10000

      // Check Testing category
      const testing = summaries.find(s => s.category === 'Testing')
      expect(testing).toBeDefined()
      expect(testing?.count).toBe(1)
    })

    it('should return empty array for empty database', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_items').execute()

      const summaries = await getCategorySummaries(db)
      expect(summaries).toHaveLength(0)
    })

    it('should order categories by count descending', async () => {
      const db = createKysely(env.DB)
      const summaries = await getCategorySummaries(db)

      // First category should have highest count
      expect(summaries[0].count).toBeGreaterThanOrEqual(summaries[1]?.count ?? 0)
    })
  })

  describe('getFeaturedRegistries', () => {
    it('should return featured registries with metadata', async () => {
      const db = createKysely(env.DB)
      const featured = await getFeaturedRegistries(db)

      expect(featured).toHaveLength(2)

      // Check first featured registry (go)
      expect(featured[0].name).toBe('go')
      expect(featured[0].title).toBe('Awesome Go')
      expect(featured[0].editorial_badge).toBe('editors-choice')
      expect(featured[0].featured).toBe(1)
      expect(featured[0].featured_order).toBe(1)

      // Check second featured registry (python)
      expect(featured[1].name).toBe('python')
      expect(featured[1].title).toBe('Awesome Python')
      expect(featured[1].editorial_badge).toBe('trending')
    })

    it('should order by featured_order ascending', async () => {
      const db = createKysely(env.DB)
      const featured = await getFeaturedRegistries(db)

      expect(featured[0].featured_order).toBeLessThanOrEqual(
        featured[1].featured_order ?? Number.MAX_VALUE,
      )
    })

    it('should only return registries with featured = 1', async () => {
      const db = createKysely(env.DB)

      // Update go to be non-featured
      await db
        .updateTable('registry_featured')
        .set({ featured: 0 })
        .where('registry_name', '=', 'go')
        .execute()

      const featured = await getFeaturedRegistries(db)

      // Should not include the now non-featured registry
      expect(featured).toHaveLength(1)
      expect(featured[0].name).toBe('python')
    })

    it('should return empty array when no featured registries exist', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_featured').execute()

      const featured = await getFeaturedRegistries(db)
      expect(featured).toHaveLength(0)
    })
  })

  describe('getTrendingRegistries', () => {
    it('should return trending registries ordered by stars and recency', async () => {
      const db = createKysely(env.DB)
      const trending = await getTrendingRegistries(db, 10)

      expect(trending.length).toBeGreaterThan(0)

      // Go should be first (highest stars and more recent)
      expect(trending[0].name).toBe('go')
      expect(trending[0].title).toBe('Awesome Go')
      expect(trending[0].total_stars).toBe(60000)

      // Python should be second
      expect(trending[1].name).toBe('python')
      expect(trending[1].total_stars).toBe(30000)
    })

    it('should respect limit parameter', async () => {
      const db = createKysely(env.DB)
      const trending = await getTrendingRegistries(db, 1)

      expect(trending).toHaveLength(1)
    })

    it('should calculate starsGrowth metric', async () => {
      const db = createKysely(env.DB)
      const trending = await getTrendingRegistries(db, 10)

      // starsGrowth is calculated as total_stars / 100
      expect(trending[0].starsGrowth).toBe(Math.floor(60000 / 100))
    })

    it('should return empty array when no registries exist', async () => {
      const db = createKysely(env.DB)
      // Need to delete in order due to foreign key constraints
      await db.deleteFrom('registry_featured').execute()
      await db.deleteFrom('registry_items').execute()
      await db.deleteFrom('registry_metadata').execute()

      const trending = await getTrendingRegistries(db)
      expect(trending).toHaveLength(0)
    })
  })

  describe('getRegistryDetail', () => {
    it('should return detailed registry information', async () => {
      const db = createKysely(env.DB)
      const detail = await getRegistryDetail(db, 'go')

      expect(detail).not.toBeNull()
      expect(detail?.title).toBe('Awesome Go')
      expect(detail?.description).toBe('Go frameworks and libraries')
      expect(detail?.total_items).toBe(3)
      expect(detail?.total_stars).toBe(60000)
      expect(detail?.categories).toContain('Web Frameworks')
      expect(detail?.categories).toContain('Testing')
      expect(detail?.languages).toContain('Go')
    })

    it('should return top repos ordered by stars', async () => {
      const db = createKysely(env.DB)
      const detail = await getRegistryDetail(db, 'go')

      expect(detail?.topRepos).toHaveLength(3)
      expect(detail?.topRepos[0].name).toBe('gin') // Highest stars (50000)
      expect(detail?.topRepos[0].stars).toBe(50000)
    })

    it('should exclude archived repos from top repos', async () => {
      const db = createKysely(env.DB)
      const detail = await getRegistryDetail(db, 'python')

      // Flask is archived, should not be in top repos
      expect(detail?.topRepos).toHaveLength(1)
      expect(detail?.topRepos[0].name).toBe('django')
    })

    it('should return null for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const detail = await getRegistryDetail(db, 'nonexistent')

      expect(detail).toBeNull()
    })

    it('should include repo details in topRepos', async () => {
      const db = createKysely(env.DB)
      const detail = await getRegistryDetail(db, 'go')

      const firstRepo = detail?.topRepos[0]
      expect(firstRepo).toBeDefined()
      expect(firstRepo?.owner).toBe('gin-gonic')
      expect(firstRepo?.category).toBe('Web Frameworks')
      expect(firstRepo?.language).toBe('Go')
    })
  })

  describe('getRepoDetail', () => {
    it('should return detailed repo information', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      expect(detail).not.toBeNull()
      expect(detail?.name).toBe('gin')
      expect(detail?.owner).toBe('gin-gonic')
      expect(detail?.registryName).toBe('go')
      expect(detail?.stars).toBe(50000)
      expect(detail?.language).toBe('Go')
      expect(detail?.category).toBe('Web Frameworks')
    })

    it('should return related repos from same category', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      expect(detail?.relatedRepos.length).toBeGreaterThan(0)

      // Echo should be in related repos (same category: Web Frameworks, same registry)
      const echo = detail?.relatedRepos.find(r => r.name === 'echo')
      expect(echo).toBeDefined()
    })

    it('should exclude current repo from related repos', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      const hasGin = detail?.relatedRepos.some(r => r.name === 'gin')
      expect(hasGin).toBe(false)
    })

    it('should exclude archived repos from related repos', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'pallets', 'flask')

      // Flask is archived, relatedRepos should still work
      expect(detail).not.toBeNull()

      // Django is in the same registry and category as Flask
      // and is non-archived, so it should appear as a related repo
      expect(detail?.relatedRepos).toHaveLength(1)
      expect(detail?.relatedRepos[0].name).toBe('django')
    })

    it('should return null for non-existent repo', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'nonexistent', 'repo')

      expect(detail).toBeNull()
    })

    it('should order related repos by stars descending', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      if (detail && detail.relatedRepos.length > 1) {
        const firstStars = detail.relatedRepos[0].stars
        const secondStars = detail.relatedRepos[1].stars
        expect(firstStars).toBeGreaterThanOrEqual(secondStars)
      }
    })
  })
})
