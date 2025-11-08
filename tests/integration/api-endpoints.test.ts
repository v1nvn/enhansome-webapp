/**
 * Integration tests for API HTTP endpoints
 * Tests the actual HTTP responses from API route handlers
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'
import { createKysely } from '@/lib/db'

describe('API HTTP Endpoints', () => {
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
  })

  describe('GET /api/metadata', () => {
    it('should return registry metadata with stats', async () => {
      const { Route } = await import('@/routes/api.metadata')
      // Type assertion to extract the handler
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as () => Promise<Response>

      const response = await handler()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')

      const data = (await response.json()) as Array<{
        description: string
        name: string
        source_repository: string
        stats: {
          languages: string[]
          latestUpdate: string
          totalRepos: number
          totalStars: number
        }
        title: string
      }>

      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)

      // Check Go registry
      const goRegistry = data.find(r => r.name === 'go')
      expect(goRegistry).toBeDefined()
      expect(goRegistry?.title).toBe('Awesome Go')
      expect(goRegistry?.stats.totalRepos).toBe(3)
      expect(goRegistry?.stats.totalStars).toBe(60000)
      expect(goRegistry?.stats.languages).toContain('Go')

      // Check Python registry
      const pythonRegistry = data.find(r => r.name === 'python')
      expect(pythonRegistry).toBeDefined()
      expect(pythonRegistry?.title).toBe('Awesome Python')
      expect(pythonRegistry?.stats.totalRepos).toBe(2)
      expect(pythonRegistry?.stats.totalStars).toBe(30000)
    })

    it('should return empty array when no registries exist', async () => {
      const db = createKysely(env.DB)
      await db.deleteFrom('registry_metadata').execute()

      const { Route } = await import('@/routes/api.metadata')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as () => Promise<Response>

      const response = await handler()

      expect(response.status).toBe(200)
      const data = (await response.json()) as unknown[]
      expect(data).toHaveLength(0)
    })

    it('should have correct cache headers', async () => {
      const { Route } = await import('@/routes/api.metadata')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as () => Promise<Response>

      const response = await handler()

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('GET /api/languages', () => {
    it('should return all unique languages', async () => {
      const { Route } = await import('@/routes/api.languages')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/languages')
      const response = await handler({ request })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      const languages = (await response.json()) as string[]
      expect(Array.isArray(languages)).toBe(true)
      expect(languages).toHaveLength(2)
      expect(languages).toContain('Go')
      expect(languages).toContain('Python')
    })

    it('should filter languages by registry parameter', async () => {
      const { Route } = await import('@/routes/api.languages')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/languages?registry=go')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const languages = (await response.json()) as string[]
      expect(languages).toHaveLength(1)
      expect(languages).toContain('Go')
    })

    it('should return empty array for non-existent registry', async () => {
      const { Route } = await import('@/routes/api.languages')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request(
        'http://localhost/api/languages?registry=nonexistent',
      )
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const languages = (await response.json()) as string[]
      expect(languages).toHaveLength(0)
    })

    it('should have correct cache headers', async () => {
      const { Route } = await import('@/routes/api.languages')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/languages')
      const response = await handler({ request })

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('GET /api/categories', () => {
    it('should return all categories with counts', async () => {
      const { Route } = await import('@/routes/api.categories')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/categories')
      const response = await handler({ request })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      const categories = (await response.json()) as Array<{
        category: string
        count: number
        key: string
        registry: string
      }>
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)

      // Check category structure
      const category = categories[0]
      expect(category).toHaveProperty('key')
      expect(category).toHaveProperty('registry')
      expect(category).toHaveProperty('category')
      expect(category).toHaveProperty('count')

      // Check specific category
      const goWebFrameworks = categories.find(
        c => c.registry === 'go' && c.category === 'Web Frameworks',
      )
      expect(goWebFrameworks).toBeDefined()
      expect(goWebFrameworks?.count).toBe(2)

      const goTesting = categories.find(
        c => c.registry === 'go' && c.category === 'Testing',
      )
      expect(goTesting).toBeDefined()
      expect(goTesting?.count).toBe(1)
    })

    it('should filter categories by registry parameter', async () => {
      const { Route } = await import('@/routes/api.categories')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/categories?registry=python')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const categories = (await response.json()) as Array<{ registry: string }>
      expect(categories.every(c => c.registry === 'python')).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existent registry', async () => {
      const { Route } = await import('@/routes/api.categories')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request(
        'http://localhost/api/categories?registry=nonexistent',
      )
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const categories = (await response.json()) as unknown[]
      expect(categories).toHaveLength(0)
    })

    it('should have correct cache headers', async () => {
      const { Route } = await import('@/routes/api.categories')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/categories')
      const response = await handler({ request })

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('GET /api/search', () => {
    it('should return all items without filters', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search')
      const response = await handler({ request })

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')

      const result = (await response.json()) as {
        data: unknown[]
        hasMore: boolean
        offset: number
        total: number
      }
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
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?registry=go')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ registry: string }>
        total: number
      }
      expect(result.total).toBe(3)
      expect(result.data.every(item => item.registry === 'go')).toBe(true)
    })

    it('should filter by language parameter', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?language=Python')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ repo_info?: { language: string } }>
        total: number
      }
      expect(result.total).toBe(2)
      expect(
        result.data.every(item => item.repo_info?.language === 'Python'),
      ).toBe(true)
    })

    it('should filter by minStars parameter', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?minStars=10000')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ repo_info?: { stars: number } }>
        total: number
      }
      expect(result.total).toBe(3) // Gin, Django, Flask
      expect(
        result.data.every(item => (item.repo_info?.stars ?? 0) >= 10000),
      ).toBe(true)
    })

    it('should filter by archived parameter (false)', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?archived=false')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ repo_info?: { archived: boolean } }>
        total: number
      }
      expect(result.total).toBe(4) // All except Flask
      expect(
        result.data
          .filter(item => item.repo_info)
          .every(item => item.repo_info?.archived === false),
      ).toBe(true)
    })

    it('should filter by archived parameter (true)', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?archived=true')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ title: string }>
        total: number
      }
      expect(result.total).toBe(1)
      expect(result.data[0]?.title).toBe('Flask')
    })

    it('should search by text query parameter', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?q=framework')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ description?: string; title: string }>
        total: number
      }
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
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?sortBy=name')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ title: string }>
      }
      const titles = result.data.map(item => item.title)
      expect(titles[0]).toBe('Django') // Alphabetically first
    })

    it('should sort by sortBy parameter (stars) - default', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?sortBy=stars')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ repo_info?: { stars: number }; title: string }>
      }
      expect(result.data[0]?.title).toBe('Gin') // Highest stars
      expect(result.data[0]?.repo_info?.stars).toBe(50000)
    })

    it('should handle pagination with limit and offset', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?limit=2&offset=0')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: unknown[]
        hasMore: boolean
        offset: number
        total: number
      }
      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.offset).toBe(0)
    })

    it('should handle second page of pagination', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?limit=2&offset=2')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: unknown[]
        hasMore: boolean
        offset: number
        total: number
      }
      expect(result.total).toBe(5)
      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.offset).toBe(2)
    })

    it('should combine multiple query parameters', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request(
        'http://localhost/api/search?registry=go&language=Go&minStars=5000',
      )
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{
          registry: string
          repo_info?: { language: string; stars: number }
        }>
        total: number
      }
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
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?registry=nonexistent')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: unknown[]
        total: number
      }
      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should handle invalid sortBy parameter gracefully', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?sortBy=invalid')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: Array<{ title: string }>
      }
      // Should default to 'stars' sorting
      expect(result.data[0]?.title).toBe('Gin') // Highest stars
    })

    it('should handle invalid archived parameter gracefully', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?archived=invalid')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as { total: number }
      // Should return all items when archived parameter is invalid
      expect(result.total).toBe(5)
    })

    it('should handle zero minStars', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?minStars=0')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as { total: number }
      expect(result.total).toBe(5)
    })

    it('should handle very high minStars filtering all items', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search?minStars=100000')
      const response = await handler({ request })

      expect(response.status).toBe(200)

      const result = (await response.json()) as {
        data: unknown[]
        total: number
      }
      expect(result.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('should have correct cache headers', async () => {
      const { Route } = await import('@/routes/api.search')
      const handler = (Route.options.server?.handlers as Record<string, unknown>)
        ?.GET as (ctx: { request: Request }) => Promise<Response>

      const request = new Request('http://localhost/api/search')
      const response = await handler({ request })

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })
})
