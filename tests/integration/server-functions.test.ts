/**
 * Integration tests for server function handlers
 * Tests the handler logic and validators extracted from server functions
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import { createKysely } from '@/lib/db'
import {
  fetchCategoriesHandler,
  fetchLanguagesHandler,
  fetchMetadataHandler,
  fetchRegistryHandler,
  searchRegistryItemsHandler,
  validateFetchCategoriesInput,
  validateFetchLanguagesInput,
  validateSearchParams,
} from '@/lib/server-functions'

describe('Server Function Handlers', () => {
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

    // Insert registry metadata
    await db
      .insertInto('registry_metadata')
      .values([
        {
          description: 'Go frameworks and libraries',
          last_updated: '2025-10-12T00:00:00Z',
          registry_name: 'go',
          source_repository: 'avelino/awesome-go',
          title: 'Awesome Go',
          total_items: 3,
          total_stars: 60000,
        },
        {
          description: 'Python libraries',
          last_updated: '2025-10-11T00:00:00Z',
          registry_name: 'python',
          source_repository: 'vinta/awesome-python',
          title: 'Awesome Python',
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
          archived: 0,
          category: 'Web Frameworks',
          description: 'HTTP web framework',
          language: 'Go',
          last_commit: '2025-10-10T00:00:00Z',
          registry_name: 'go',
          repo_name: 'gin',
          repo_owner: 'gin-gonic',
          stars: 50000,
          title: 'Gin',
        },
        {
          archived: 0,
          category: 'Web Frameworks',
          description: 'High performance framework',
          language: 'Go',
          last_commit: '2025-10-09T00:00:00Z',
          registry_name: 'go',
          repo_name: 'echo',
          repo_owner: 'labstack',
          stars: 8000,
          title: 'Echo',
        },
        {
          archived: 0,
          category: 'Testing',
          description: 'Testing toolkit',
          language: 'Go',
          last_commit: '2025-10-08T00:00:00Z',
          registry_name: 'go',
          repo_name: 'testify',
          repo_owner: 'stretchr',
          stars: 2000,
          title: 'Testify',
        },
        {
          archived: 0,
          category: 'Web Frameworks',
          description: 'Web framework',
          language: 'Python',
          last_commit: '2025-10-07T00:00:00Z',
          registry_name: 'python',
          repo_name: 'django',
          repo_owner: 'django',
          stars: 20000,
          title: 'Django',
        },
        {
          archived: 1,
          category: 'Web Frameworks',
          description: 'Micro framework',
          language: 'Python',
          last_commit: '2025-10-06T00:00:00Z',
          registry_name: 'python',
          repo_name: 'flask',
          repo_owner: 'pallets',
          stars: 10000,
          title: 'Flask',
        },
      ])
      .execute()
  })

  describe('fetchRegistryHandler', () => {
    it('should return all registries with their data', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRegistryHandler(db)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)

      // Check Go registry
      const goRegistry = result.find(r => r.name === 'go')
      expect(goRegistry).toBeDefined()
      expect(goRegistry?.data.items).toHaveLength(2) // 2 categories: Web Frameworks, Testing

      // Check Python registry
      const pythonRegistry = result.find(r => r.name === 'python')
      expect(pythonRegistry).toBeDefined()
      expect(pythonRegistry?.data.items).toHaveLength(1) // 1 category: Web Frameworks
    })

    it('should return empty array when no registries exist', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_metadata').execute()

      const result = await fetchRegistryHandler(db)

      expect(result).toHaveLength(0)
    })
  })

  describe('fetchMetadataHandler', () => {
    it('should return registry metadata with stats', async () => {
      const db = createKysely(env.DB)
      const result = await fetchMetadataHandler(db)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)

      // Check Go registry
      const goRegistry = result.find(r => r.name === 'go')
      expect(goRegistry).toBeDefined()
      expect(goRegistry?.title).toBe('Awesome Go')
      expect(goRegistry?.stats.totalRepos).toBe(3)
      expect(goRegistry?.stats.totalStars).toBe(60000)
      expect(goRegistry?.stats.languages).toContain('Go')

      // Check Python registry
      const pythonRegistry = result.find(r => r.name === 'python')
      expect(pythonRegistry).toBeDefined()
      expect(pythonRegistry?.title).toBe('Awesome Python')
      expect(pythonRegistry?.stats.totalRepos).toBe(2)
      expect(pythonRegistry?.stats.totalStars).toBe(30000)
    })

    it('should return empty array when no registries exist', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_metadata').execute()

      const result = await fetchMetadataHandler(db)

      expect(result).toHaveLength(0)
    })
  })

  describe('fetchLanguagesHandler', () => {
    it('should return all unique languages', async () => {
      const db = createKysely(env.DB)
      const result = await fetchLanguagesHandler(db, {})

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result).toContain('Go')
      expect(result).toContain('Python')
    })

    it('should filter languages by registry parameter', async () => {
      const db = createKysely(env.DB)
      const result = await fetchLanguagesHandler(db, { registry: 'go' })

      expect(result).toHaveLength(1)
      expect(result).toContain('Go')
    })

    it('should return empty array for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await fetchLanguagesHandler(db, {
        registry: 'nonexistent',
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('validateFetchLanguagesInput', () => {
    it('should pass through valid input', () => {
      const input = { registry: 'go' }
      const result = validateFetchLanguagesInput(input)

      expect(result).toEqual(input)
    })

    it('should handle empty input', () => {
      const input = {}
      const result = validateFetchLanguagesInput(input)

      expect(result).toEqual(input)
    })
  })

  describe('fetchCategoriesHandler', () => {
    it('should return all categories with counts', async () => {
      const db = createKysely(env.DB)
      const result = await fetchCategoriesHandler(db, {})

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Check category structure
      const category = result[0]
      expect(category).toBeDefined()
      expect(category).toHaveProperty('key')
      expect(category).toHaveProperty('registry')
      expect(category).toHaveProperty('category')
      expect(category).toHaveProperty('count')

      // Check specific category
      const goWebFrameworks = result.find(
        c => c.registry === 'go' && c.category === 'Web Frameworks',
      )
      expect(goWebFrameworks).toBeDefined()
      expect(goWebFrameworks?.count).toBe(2)

      const goTesting = result.find(
        c => c.registry === 'go' && c.category === 'Testing',
      )
      expect(goTesting).toBeDefined()
      expect(goTesting?.count).toBe(1)
    })

    it('should filter categories by registry parameter', async () => {
      const db = createKysely(env.DB)
      const result = await fetchCategoriesHandler(db, { registry: 'python' })

      expect(result.every(c => c.registry === 'python')).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await fetchCategoriesHandler(db, {
        registry: 'nonexistent',
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('validateFetchCategoriesInput', () => {
    it('should pass through valid input', () => {
      const input = { registry: 'go' }
      const result = validateFetchCategoriesInput(input)

      expect(result).toEqual(input)
    })

    it('should handle empty input', () => {
      const input = {}
      const result = validateFetchCategoriesInput(input)

      expect(result).toEqual(input)
    })
  })

  describe('searchRegistryItemsHandler', () => {
    it('should return all items without filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {})

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('hasMore')
      expect(result).toHaveProperty('offset')

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(5)
      expect(result.hasMore).toBe(false)
      expect(result.offset).toBe(0)
    })

    it('should filter by registry parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {
        registryName: 'go',
      })

      expect(result.total).toBe(3)
      expect(result.data.every(item => item.registry === 'go')).toBe(true)
    })

    it('should filter by language parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { language: 'Python' })

      expect(result.total).toBe(2)
      expect(
        result.data.every(item => item.repo_info?.language === 'Python'),
      ).toBe(true)
    })

    it('should filter by minStars parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { minStars: 10000 })

      expect(result.total).toBe(3) // Gin, Django, Flask
      expect(
        result.data.every(item => (item.repo_info?.stars ?? 0) >= 10000),
      ).toBe(true)
    })

    it('should filter by archived parameter (false)', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { archived: false })

      expect(result.total).toBe(4) // All except Flask
      expect(
        result.data.every(item => item.repo_info?.archived === false),
      ).toBe(true)
    })

    it('should filter by archived parameter (true)', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { archived: true })

      expect(result.total).toBe(1)
      expect(result.data[0]?.title).toBe('Flask')
    })

    it('should search by text query parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { q: 'framework' })

      expect(result.total).toBeGreaterThan(0)
      expect(
        result.data.every(
          item =>
            item.title.toLowerCase().includes('framework') ||
            item.description?.toLowerCase().includes('framework'),
        ),
      ).toBe(true)
    })

    it('should sort by sortBy parameter (name)', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { sortBy: 'name' })

      const titles = result.data.map(item => item.title)
      expect(titles[0]).toBe('Django') // Alphabetically first
    })

    it('should sort by sortBy parameter (stars) - default', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { sortBy: 'stars' })

      expect(result.data[0]?.title).toBe('Gin') // Highest stars
      expect(result.data[0]?.repo_info?.stars).toBe(50000)
    })

    it('should handle pagination with limit and offset', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {
        limit: 2,
        offset: 0,
      })

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.offset).toBe(0)
    })

    it('should handle second page of pagination', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {
        limit: 2,
        offset: 2,
      })

      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.offset).toBe(2)
    })

    it('should combine multiple query parameters', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {
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
        result.data.every(item => (item.repo_info?.stars ?? 0) >= 5000),
      ).toBe(true)
    })

    it('should return empty results for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, {
        registryName: 'nonexistent',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle zero minStars', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { minStars: 0 })

      expect(result.total).toBe(5)
    })

    it('should handle very high minStars filtering all items', async () => {
      const db = createKysely(env.DB)
      const result = await searchRegistryItemsHandler(db, { minStars: 100000 })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('validateSearchParams', () => {
    it('should pass through valid input', () => {
      const input = {
        archived: false,
        language: 'Go',
        limit: 10,
        minStars: 100,
        offset: 0,
        q: 'test',
        registryName: 'go',
        sortBy: 'stars' as const,
      }
      const result = validateSearchParams(input)

      expect(result).toEqual(input)
    })

    it('should handle empty input', () => {
      const input = {}
      const result = validateSearchParams(input)

      expect(result).toEqual(input)
    })

    it('should handle partial input', () => {
      const input = { limit: 50, registryName: 'python' }
      const result = validateSearchParams(input)

      expect(result).toEqual(input)
    })
  })
})
