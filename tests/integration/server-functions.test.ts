/**
 * Integration tests for server function handlers
 * Tests the handler logic and validators extracted from server functions
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

import { createKysely } from '@/lib/db'
import {
  fetchLanguagesHandler,
  fetchMetadataHandler,
  fetchRegistryDetailHandler,
  fetchRepoDetailHandler,
  fetchTrendingRegistriesHandler,
  searchReposHandler,
  validateFetchLanguagesInput,
  validateFetchRegistryDetailInput,
  validateFetchRepoDetailInput,
  validateSearchParams,
} from '@/lib/server-functions'

/**
 * Helper to seed test data with the new many-to-many schema
 */
async function seedTestData(db: ReturnType<typeof createKysely>) {
  // Insert repositories
  await db
    .insertInto('repositories')
    .values([
      {
        archived: 0,
        description: 'HTTP web framework',
        language: 'Go',
        last_commit: '2025-10-10T00:00:00Z',
        name: 'gin',
        owner: 'gin-gonic',
        stars: 50000,
      },
      {
        archived: 0,
        description: 'High performance framework',
        language: 'Go',
        last_commit: '2025-10-09T00:00:00Z',
        name: 'echo',
        owner: 'labstack',
        stars: 8000,
      },
      {
        archived: 0,
        description: 'Testing toolkit',
        language: 'Go',
        last_commit: '2025-10-08T00:00:00Z',
        name: 'testify',
        owner: 'stretchr',
        stars: 2000,
      },
      {
        archived: 0,
        description: 'Web framework',
        language: 'Python',
        last_commit: '2025-10-07T00:00:00Z',
        name: 'django',
        owner: 'django',
        stars: 20000,
      },
      {
        archived: 1,
        description: 'Micro framework',
        language: 'Python',
        last_commit: '2025-10-06T00:00:00Z',
        name: 'flask',
        owner: 'pallets',
        stars: 10000,
      },
    ])
    .execute()

  // Get repository IDs for linking
  const repos = await db
    .selectFrom('repositories')
    .select(['id', 'owner', 'name'])
    .execute()

  const repoMap = new Map(
    repos.map(r => [`${r.owner}/${r.name}`, r.id]),
  )

  const ginId = repoMap.get('gin-gonic/gin')!
  const echoId = repoMap.get('labstack/echo')!
  const testifyId = repoMap.get('stretchr/testify')!
  const djangoId = repoMap.get('django/django')!
  const flaskId = repoMap.get('pallets/flask')!

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

  // Link repositories via junction table
  await db
    .insertInto('registry_repositories')
    .values([
      {
        categories: JSON.stringify(['Web Frameworks']),
        registry_name: 'go',
        repository_id: ginId,
        title: 'Gin',
      },
      {
        categories: JSON.stringify(['Web Frameworks']),
        registry_name: 'go',
        repository_id: echoId,
        title: 'Echo',
      },
      {
        categories: JSON.stringify(['Testing']),
        registry_name: 'go',
        repository_id: testifyId,
        title: 'Testify',
      },
      {
        categories: JSON.stringify(['Web Frameworks']),
        registry_name: 'python',
        repository_id: djangoId,
        title: 'Django',
      },
      {
        categories: JSON.stringify(['Web Frameworks']),
        registry_name: 'python',
        repository_id: flaskId,
        title: 'Flask',
      },
    ])
    .execute()

  // Insert featured registries
  await db
    .insertInto('registry_featured')
    .values([
      {
        editorial_badge: 'editors-choice',
        featured: 1,
        featured_order: 1,
        registry_name: 'go',
      },
      {
        editorial_badge: 'trending',
        featured: 1,
        featured_order: 2,
        registry_name: 'python',
      },
    ])
    .execute()
}

describe('Server Function Handlers', () => {
  beforeAll(async () => {
    // Apply migrations
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])
  })

  beforeEach(async () => {
    // Clear and seed test data
    const db = createKysely(env.DB)

    // Clear existing data in correct order due to foreign key constraints
    await db.deleteFrom('registry_featured').execute()
    await db.deleteFrom('registry_repositories').execute()
    await db.deleteFrom('repositories').execute()
    await db.deleteFrom('registry_metadata').execute()

    // Seed test data
    await seedTestData(db)
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
      // Need to delete in order due to foreign key constraints
      await db.deleteFrom('registry_featured').execute()
      await db.deleteFrom('registry_repositories').execute()
      await db.deleteFrom('repositories').execute()
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

  describe('searchReposHandler', () => {
    it('should return all items without filters', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, {})

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('hasMore')
      expect(result).toHaveProperty('nextCursor')

      // Note: archived defaults to false, so Flask (archived) is excluded
      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(4)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
    })

    it('should filter by registry parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, {
        registryName: 'go',
      })

      expect(result.total).toBe(3)
      expect(result.data.every(item => item.registries.includes('go'))).toBe(true)
    })

    it('should filter by language parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { language: 'Python' })

      // Flask is archived and archived defaults to false, so only Django is returned
      expect(result.total).toBe(1)
      expect(
        result.data.every(item => item.repo_info?.language === 'Python'),
      ).toBe(true)
    })

    it('should filter by minStars parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { minStars: 10000 })

      // Gin (50000), Django (20000) - Flask is archived
      expect(result.total).toBe(2)
      expect(
        result.data.every(item => (item.repo_info?.stars ?? 0) >= 10000),
      ).toBe(true)
    })

    it('should filter by archived parameter (false)', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { archived: false })

      expect(result.total).toBe(4) // All except Flask
      expect(
        result.data.every(item => item.repo_info?.archived === false),
      ).toBe(true)
    })

    it('should filter by archived parameter (true)', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { archived: true })

      // Flask is the only archived repo in our test data
      expect(result.total).toBe(1)
      expect(result.data[0]?.title).toBe('Flask')
    })

    it('should search by text query parameter', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { q: 'framework' })

      // Note: Flask (which contains 'framework' in description) is archived and excluded by default
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
      const result = await searchReposHandler(db, { sortBy: 'name' })

      const titles = result.data.map(item => item.title)
      expect(titles[0]).toBe('Django') // Alphabetically first
    })

    it('should sort by sortBy parameter (stars) - default', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { sortBy: 'stars' })

      expect(result.data[0]?.title).toBe('Gin') // Highest stars
      expect(result.data[0]?.repo_info?.stars).toBe(50000)
    })

    it('should handle cursor-based pagination (first page)', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, {
        limit: 2,
      })

      // Note: 4 non-archived items total
      expect(result.total).toBe(4)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBeDefined()
    })

    it('should handle cursor-based pagination (second page)', async () => {
      const db = createKysely(env.DB)
      // First get the first page to get the cursor
      const firstPage = await searchReposHandler(db, {
        limit: 2,
      })

      // Then get the second page using the cursor
      const result = await searchReposHandler(db, {
        cursor: firstPage.nextCursor,
        limit: 2,
      })

      // Note: 4 non-archived items total
      expect(result.total).toBe(4)
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.length).toBeLessThanOrEqual(2)
    })

    it('should combine multiple query parameters', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, {
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
        result.data.every(item => (item.repo_info?.stars ?? 0) >= 5000),
      ).toBe(true)
    })

    it('should return empty results for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, {
        registryName: 'nonexistent',
      })

      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle zero minStars', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { minStars: 0 })

      // Note: archived defaults to false, so Flask is excluded
      expect(result.total).toBe(4)
    })

    it('should handle very high minStars filtering all items', async () => {
      const db = createKysely(env.DB)
      const result = await searchReposHandler(db, { minStars: 100000 })

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

  describe('fetchTrendingRegistriesHandler', () => {
    it('should return trending registries ordered by stars', async () => {
      const db = createKysely(env.DB)
      const result = await fetchTrendingRegistriesHandler(db, 10)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Go should be first (highest stars)
      expect(result[0].name).toBe('go')
      expect(result[0].total_stars).toBe(60000)
    })

    it('should respect limit parameter', async () => {
      const db = createKysely(env.DB)
      const result = await fetchTrendingRegistriesHandler(db, 1)

      expect(result).toHaveLength(1)
    })

    it('should return empty array when no registries exist', async () => {
      const db = createKysely(env.DB)
      // Need to delete in order due to foreign key constraints
      await db.deleteFrom('registry_featured').execute()
      await db.deleteFrom('registry_repositories').execute()
      await db.deleteFrom('repositories').execute()
      await db.deleteFrom('registry_metadata').execute()

      const result = await fetchTrendingRegistriesHandler(db)
      expect(result).toHaveLength(0)
    })
  })

  describe('fetchRegistryDetailHandler', () => {
    it('should return detailed registry information', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRegistryDetailHandler(db, { name: 'go' })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('Awesome Go')
      expect(result?.total_items).toBe(3)
      expect(result?.categories).toContain('Web Frameworks')
      expect(result?.languages).toContain('Go')
    })

    it('should return top repos in detail', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRegistryDetailHandler(db, { name: 'go' })

      expect(result?.topRepos).toHaveLength(3)
      expect(result?.topRepos[0].name).toBe('gin') // Highest stars
    })

    it('should return null for non-existent registry', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRegistryDetailHandler(db, {
        name: 'nonexistent',
      })

      expect(result).toBeNull()
    })
  })

  describe('validateFetchRegistryDetailInput', () => {
    it('should pass through valid input', () => {
      const input = { name: 'go' }
      const result = validateFetchRegistryDetailInput(input)

      expect(result).toEqual(input)
    })
  })

  describe('fetchRepoDetailHandler', () => {
    it('should return detailed repo information', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRepoDetailHandler(db, {
        name: 'gin',
        owner: 'gin-gonic',
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe('gin')
      expect(result?.owner).toBe('gin-gonic')
      expect(result?.stars).toBe(50000)
    })

    it('should return related repos from same registry', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRepoDetailHandler(db, {
        name: 'gin',
        owner: 'gin-gonic',
      })

      expect(result?.relatedRepos.length).toBeGreaterThan(0)

      // Echo should be in related repos
      const echo = result?.relatedRepos.find(r => r.name === 'echo')
      expect(echo).toBeDefined()
    })

    it('should return null for non-existent repo', async () => {
      const db = createKysely(env.DB)
      const result = await fetchRepoDetailHandler(db, {
        name: 'nonexistent',
        owner: 'nonexistent',
      })

      expect(result).toBeNull()
    })
  })

  describe('validateFetchRepoDetailInput', () => {
    it('should pass through valid input', () => {
      const input = { name: 'gin', owner: 'gin-gonic' }
      const result = validateFetchRepoDetailInput(input)

      expect(result).toEqual(input)
    })
  })
})
