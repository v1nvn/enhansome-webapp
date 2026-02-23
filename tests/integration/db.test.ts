/**
 * Integration tests for database query functions
 * Tests all the database query functions used by the application
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import {
  createKysely,
} from '@/lib/db'
import {
  getAllRegistryStatsBatched,
  getCategorySummaries,
  getFeaturedRegistries,
  getRegistryData,
  getRegistryDetail,
  getRegistryMetadata,
  getRepoDetail,
  getTrendingRegistries,
  searchRepos,
} from '@/lib/db/repositories'
import {
  getLanguages,
} from '@/lib/db/queries/aggregator'
import { clearDatabase } from '../helpers/cleanup-database'
import { seedTestData } from '../helpers/seed-test-data'

describe('Database Query Functions', () => {
  beforeAll(async () => {
    // Apply migrations
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    // Clear and seed test data using shared helpers
    const db = createKysely(env.DB)
    await clearDatabase(db)
    await seedTestData(db)
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
      await clearDatabase(db)

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

    it('should handle empty items list when no items have repo_info', async () => {
      const db = createKysely(env.DB)

      // Items without repo_info are skipped in the new schema
      // So we test the behavior with items that have repo_info
      const data = await getRegistryData(db, 'go')
      expect(data.items.length).toBeGreaterThan(0)

      // All items in our test data have repo_info
      const itemWithoutRepoInfo = data.items
        .flatMap(cat => cat.items)
        .find(item => !item.repo_info)

      expect(itemWithoutRepoInfo).toBeUndefined()
    })
  })

  describe('getAllRegistryStatsBatched', () => {
    it('should return stats for all registries in a single query', async () => {
      const db = createKysely(env.DB)
      const statsMap = await getAllRegistryStatsBatched(db)

      expect(statsMap.size).toBe(2) // go and python

      // Check Go registry - values based on seedTestData
      const goStats = statsMap.get('go')
      expect(goStats).toBeDefined()
      expect(goStats?.totalRepos).toBe(3)
      expect(goStats?.totalStars).toBe(60000)
      expect(goStats?.languages).toEqual(['Go'])
      expect(goStats?.latestUpdate).toBe('2025-10-12T00:00:00Z')

      // Check Python registry
      const pythonStats = statsMap.get('python')
      expect(pythonStats).toBeDefined()
      expect(pythonStats?.totalRepos).toBe(2)
      expect(pythonStats?.totalStars).toBe(30000)
      expect(pythonStats?.languages).toEqual(['Python'])
      expect(pythonStats?.latestUpdate).toBe('2025-10-11T00:00:00Z')
    })

    it('should return empty map when no registries exist', async () => {
      const db = createKysely(env.DB)
      await clearDatabase(db)

      const statsMap = await getAllRegistryStatsBatched(db)

      expect(statsMap.size).toBe(0)
    })

    it('should handle registries with no languages', async () => {
      const db = createKysely(env.DB)
      // Insert a registry with metadata but no repositories (no languages)
      await db
        .insertInto('registry_metadata')
        .values({
          description: 'Empty registry',
          last_updated: '2025-10-13T00:00:00Z',
          registry_name: 'empty',
          source_repository: 'test/empty',
          title: 'Empty',
          total_items: 0,
          total_stars: 0,
        })
        .execute()

      const statsMap = await getAllRegistryStatsBatched(db)

      const emptyStats = statsMap.get('empty')
      expect(emptyStats).toBeDefined()
      expect(emptyStats?.languages).toHaveLength(0)
      expect(emptyStats?.totalRepos).toBe(0)
      expect(emptyStats?.totalStars).toBe(0)
      expect(emptyStats?.latestUpdate).toBe('2025-10-13T00:00:00Z')
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
      await clearDatabase(db)

      const languages = await getLanguages(db)
      expect(languages).toHaveLength(0)
    })
  })

  describe('Categories Query', () => {
    it('should return categories from junction table', async () => {
      const db = createKysely(env.DB)

      // Get all rows with categories via junction table
      const rows = await db
        .selectFrom('registry_repository_categories')
        .innerJoin('categories', 'categories.id', 'registry_repository_categories.category_id')
        .select(['registry_repository_categories.registry_name', 'categories.name'])
        .execute()

      // Aggregate categories
      const categoryMap = new Map<string, number>()
      for (const row of rows) {
        const key = `${row.registry_name}::${row.name}`
        categoryMap.set(key, (categoryMap.get(key) || 0) + 1)
      }

      expect(categoryMap.size).toBeGreaterThanOrEqual(2)

      // Check Web Frameworks for Go
      const goWebFrameworks = categoryMap.get('go::Web Frameworks')
      expect(goWebFrameworks).toBeDefined()
      expect(goWebFrameworks).toBe(2)

      // Check Testing for Go
      const goTesting = categoryMap.get('go::Testing')
      expect(goTesting).toBeDefined()
      expect(goTesting).toBe(1)
    })

    it('should filter categories by registry', async () => {
      const db = createKysely(env.DB)

      const rows = await db
        .selectFrom('registry_repository_categories')
        .innerJoin('categories', 'categories.id', 'registry_repository_categories.category_id')
        .select(['registry_repository_categories.registry_name', 'categories.name'])
        .where('registry_repository_categories.registry_name', '=', 'python')
        .execute()

      // Aggregate categories
      const categorySet = new Set<string>()
      for (const row of rows) {
        categorySet.add(row.name)
      }

      expect(categorySet.size).toBeGreaterThan(0)
      expect(categorySet.has('Web Frameworks')).toBe(true)
    })
  })

  describe('searchRepos', () => {
    it('should return all items without filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {})

      // Note: archived defaults to false, so Flask (archived=1) is excluded
      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(4)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
      expect(result.data[0]).toHaveProperty('id')
    })

    it('should filter by registry', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { registryName: 'go' })

      expect(result.total).toBe(3)
      expect(result.data.every(item => item.registries.includes('go'))).toBe(true)
    })

    it('should filter by language', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { language: 'Python' })

      // Note: Flask is archived and excluded by default, so only Django is returned
      expect(result.total).toBe(1)
      expect(
        result.data.every(item => item.repo_info?.language === 'Python'),
      ).toBe(true)
    })

    it('should filter by minimum stars', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { minStars: 10000 })

      expect(result.total).toBe(2) // Gin (50000), Django (20000) - Flask is archived
      expect(
        result.data.every(item => (item.repo_info?.stars || 0) >= 10000),
      ).toBe(true)
    })

    it('should filter by archived status', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { archived: false })

      expect(result.total).toBe(4) // All except Flask
      expect(
        result.data
          .filter(item => item.repo_info)
          .every(item => item.repo_info?.archived === false),
      ).toBe(true)
    })

    it('should search by text query', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { q: 'framework' })

      expect(result.total).toBeGreaterThan(0)
      expect(
        result.data.every(
          item =>
            item.title.toLowerCase().includes('framework') ||
            item.description?.toLowerCase().includes('framework'),
        ),
      ).toBe(true)
    })

    it('should use LIKE wildcards in search query', async () => {
      const db = createKysely(env.DB)

      // LIKE wildcards are supported (%, _)
      // "test%" matches any string starting with "test"
      const result1 = await searchRepos(db, { q: 'test%' })
      // Testify contains "test" as a prefix (case-insensitive)
      expect(result1.total).toBe(1)

      // "test_" matches "test" followed by exactly one character
      // "Testify" has "testi" which matches "test_"
      const result2 = await searchRepos(db, { q: 'test_' })
      expect(result2.total).toBe(1)
    })

    it('should sort by stars descending by default', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {})

      // First item should be Gin (50000 stars)
      expect(result.data[0]?.title).toBe('Gin')
      expect(result.data[0]?.repo_info?.stars).toBe(50000)
    })

    it('should sort by name ascending', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { sortBy: 'name' })

      // Should be alphabetically sorted
      const titles = result.data.map(item => item.title)
      expect(titles[0]).toBe('Django')
    })

    it('should handle cursor-based pagination', async () => {
      const db = createKysely(env.DB)
      const result1 = await searchRepos(db, { limit: 2 })

      // Note: 4 non-archived items total
      expect(result1.total).toBe(4)
      expect(result1.data).toHaveLength(2)
      expect(result1.hasMore).toBe(true)
      expect(result1.nextCursor).toBeDefined()

      // Fetch next page using cursor
      const result2 = await searchRepos(db, {
        limit: 2,
        cursor: result1.nextCursor,
      })

      expect(result2.total).toBe(4)
      // Second page should have 2 items (items 3 and 4)
      expect(result2.data.length).toBeGreaterThan(0)
      expect(result2.data.length).toBeLessThanOrEqual(2)

      // Ensure no overlap - IDs should not appear in both pages
      const allIds1 = result1.data.map(item => item.id)
      const allIds2 = result2.data.map(item => item.id)
      const overlap = allIds1.filter(id => allIds2.includes(id))
      expect(overlap).toHaveLength(0)
    })

    it('should combine multiple filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {
        language: 'Go',
        minStars: 5000,
        registryName: 'go',
      })

      expect(result.total).toBe(2) // Gin and Echo
      expect(result.data.every(item => item.registries.includes('go'))).toBe(true)
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
      const result = await searchRepos(db, {
        registryName: 'nonexistent',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle query with no matches', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {
        q: 'nonexistentlibrary12345',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle language with no matches', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { language: 'Rust' })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle minStars filtering out all items', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { minStars: 100000 })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle archived items correctly', async () => {
      const db = createKysely(env.DB)

      // Only archived items
      const archivedResult = await searchRepos(db, { archived: true })
      expect(archivedResult.total).toBe(1)
      expect(archivedResult.data[0]?.title).toBe('Flask')

      // Only non-archived items
      const activeResult = await searchRepos(db, { archived: false })
      expect(activeResult.total).toBe(4)
    })

    // Edge cases
    it('should handle cursor beyond results', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {
        limit: 10,
        cursor: 99999, // Very high cursor value
      })

      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(0)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
    })

    it('should handle very large limit values', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { limit: 1000 })

      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(4)
      expect(result.hasMore).toBe(false)
    })

    it('should handle zero stars filter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { minStars: 0 })

      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(4)
    })

    it('should handle case-insensitive search', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, { q: 'FRAMEWORK' })

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
      const result = await searchRepos(db, { minStars: -100 })

      // Should treat as 0 or return all non-archived items
      expect(result.total).toBe(4)
    })

    // Note: Category filter tests removed - categories are now stored as JSON arrays
    // and filtering is done in application code, not via SQL
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      const db = createKysely(env.DB)

      await clearDatabase(db)

      const metadata = await getRegistryMetadata(db)
      expect(metadata).toHaveLength(0)

      const languages = await getLanguages(db)
      expect(languages).toHaveLength(0)

      const searchResult = await searchRepos(db, {})
      expect(searchResult.total).toBe(0)
      expect(searchResult.data).toHaveLength(0)
    })

    it('should handle special characters in search query', async () => {
      const db = createKysely(env.DB)
      const result = await searchRepos(db, {
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
        searchRepos(db, { q: longQuery }),
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
      await clearDatabase(db)

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

      // Go should be first (highest stars)
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
      await clearDatabase(db)

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
      expect(firstRepo?.categories).toContain('Web Frameworks')
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
      expect(detail?.categories).toContain('Web Frameworks')
    })

    it('should return related repos from same registry', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      expect(detail?.relatedRepos.length).toBeGreaterThan(0)

      // Echo should be in related repos (same registry)
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

    it('should return registries array for repo', async () => {
      const db = createKysely(env.DB)
      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      expect(detail?.registries).toBeDefined()
      expect(detail?.registries.length).toBe(1)
      expect(detail?.registries[0].name).toBe('go')
    })
  })

  describe('Repository Deduplication', () => {
    it('should deduplicate repos and return registries array in search', async () => {
      const db = createKysely(env.DB)

      // Get the web frameworks category ID
      const category = await db
        .selectFrom('categories')
        .select('id')
        .where('slug', '=', 'web-frameworks')
        .executeTakeFirst()

      // Get gin repository ID
      const ginRepo = await db
        .selectFrom('repositories')
        .select('id')
        .where('owner', '=', 'gin-gonic')
        .where('name', '=', 'gin')
        .executeTakeFirst()

      // Add gin to python registry as well
      if (category && ginRepo) {
        await db
          .insertInto('registry_repositories')
          .values({
            registry_name: 'python',
            repository_id: ginRepo.id,
            title: 'Gin',
          })
          .execute()

        // Link gin to web frameworks category in python registry
        await db
          .insertInto('registry_repository_categories')
          .values({
            registry_name: 'python',
            repository_id: ginRepo.id,
            category_id: category.id,
          })
          .execute()
      }

      // Search now returns one entry per repository with all registries in array
      const result = await searchRepos(db, { q: 'gin' })
      const ginEntries = result.data.filter(
        item => item.repo_info?.repo === 'gin' && item.repo_info?.owner === 'gin-gonic'
      )

      // gin appears once with both registries in the array (deduplicated)
      expect(ginEntries).toHaveLength(1)
      expect(ginEntries[0].registries).toContain('go')
      expect(ginEntries[0].registries).toContain('python')
      expect(ginEntries[0].registries).toHaveLength(2)
    })

    it('should return all registries for a repo', async () => {
      const db = createKysely(env.DB)

      // Add gin to python registry
      const ginRepo = await db
        .selectFrom('repositories')
        .select('id')
        .where('owner', '=', 'gin-gonic')
        .where('name', '=', 'gin')
        .executeTakeFirst()

      // Get web frameworks category
      const category = await db
        .selectFrom('categories')
        .select('id')
        .where('slug', '=', 'web-frameworks')
        .executeTakeFirst()

      // Add gin to python registry
      await db
        .insertInto('registry_repositories')
        .values({
          registry_name: 'python',
          repository_id: ginRepo!.id,
          title: 'Gin',
        })
        .execute()

      // Link gin to web frameworks category in python registry
      if (category) {
        await db
          .insertInto('registry_repository_categories')
          .values({
            registry_name: 'python',
            repository_id: ginRepo!.id,
            category_id: category.id,
          })
          .execute()
      }

      const detail = await getRepoDetail(db, 'gin-gonic', 'gin')

      expect(detail?.registries.length).toBe(2)
      expect(detail?.registries.map(r => r.name)).toContain('go')
      expect(detail?.registries.map(r => r.name)).toContain('python')
    })
  })
})
