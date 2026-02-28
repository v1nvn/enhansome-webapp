import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { env, applyD1Migrations } from 'cloudflare:test'
import { clearDatabase } from '../helpers/db-setup'
import { indexRegistry, rebuildFacets } from '@/lib/indexer'
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

      // Insert repositories and link via junction table
      await env.DB.batch([
        // Insert repositories
        env.DB.prepare(
          `INSERT INTO repositories (owner, name, description, stars, language, last_commit, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind('vitest-dev', 'vitest', 'Fast unit test framework', 100, 'TypeScript', '2025-10-10T00:00:00Z', 0),
        env.DB.prepare(
          `INSERT INTO repositories (owner, name, description, stars, language, last_commit, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind('microsoft', 'playwright', null, 250, 'TypeScript', '2025-10-11T00:00:00Z', 0),
      ])

      // Get repository IDs
      const vitestRepo = await env.DB.prepare('SELECT id FROM repositories WHERE owner = ? AND name = ?')
        .bind('vitest-dev', 'vitest')
        .first<{ id: number }>()
      const playwrightRepo = await env.DB.prepare('SELECT id FROM repositories WHERE owner = ? AND name = ?')
        .bind('microsoft', 'playwright')
        .first<{ id: number }>()

      expect(vitestRepo).toBeDefined()
      expect(playwrightRepo).toBeDefined()

      // Link via junction table - first insert category, then link
      // Insert a category
      await env.DB.prepare(
        `INSERT INTO categories (slug, name) VALUES (?, ?)`,
      ).bind('testing', 'Testing').run()

      // Get the category ID
      const category = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?')
        .bind('testing')
        .first<{ id: number }>()

      // Link repositories to registry and category
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO registry_repositories (registry_name, repository_id, title)
           VALUES (?, ?, ?)`,
        ).bind(registryName, vitestRepo!.id, 'Vitest'),
        env.DB.prepare(
          `INSERT INTO registry_repositories (registry_name, repository_id, title)
           VALUES (?, ?, ?)`,
        ).bind(registryName, playwrightRepo!.id, 'Playwright'),
        env.DB.prepare(
          `INSERT INTO registry_repository_categories (registry_name, repository_id, category_id)
           VALUES (?, ?, ?)`,
        ).bind(registryName, vitestRepo!.id, category!.id),
        env.DB.prepare(
          `INSERT INTO registry_repository_categories (registry_name, repository_id, category_id)
           VALUES (?, ?, ?)`,
        ).bind(registryName, playwrightRepo!.id, category!.id),
      ])

      // Verify via junction table
      const items = await env.DB.prepare(
        `SELECT rr.title, r.stars, r.owner, r.name
         FROM registry_repositories rr
         JOIN repositories r ON r.id = rr.repository_id
         WHERE rr.registry_name = ?
         ORDER BY r.stars DESC`,
      )
        .bind(registryName)
        .all()

      expect(items.results).toHaveLength(2)
      expect(items.results[0].title).toBe('Playwright')
      expect(items.results[0].stars).toBe(250)
      expect(items.results[1].title).toBe('Vitest')
      expect(items.results[1].stars).toBe(100)
    })

    it('should skip items without repo info', async () => {
      const registryName = 'test-registry'

      await env.DB.prepare(
        `INSERT INTO registry_metadata
         (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(registryName, 'Test', '', '2025-10-12T00:00:00Z', 'test/repo', 0, 0)
        .run()

      // Items without repo_info are skipped by the indexer
      // The schema requires owner and name to be NOT NULL
      const items = await env.DB.prepare(
        `SELECT COUNT(*) as count
         FROM registry_repositories
         WHERE registry_name = ?`,
      )
        .bind(registryName)
        .first<{ count: number }>()

      expect(items!.count).toBe(0)
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
        `INSERT INTO repositories (owner, name, description, stars, language, last_commit, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind('old-org', 'abandoned', 'No longer maintained', 500, null, '2020-01-01T00:00:00Z', 1)
        .run()

      const repo = await env.DB.prepare('SELECT id FROM repositories WHERE owner = ? AND name = ?')
        .bind('old-org', 'abandoned')
        .first<{ id: number }>()

      // Insert a category
      await env.DB.prepare(
        `INSERT INTO categories (slug, name) VALUES (?, ?)`,
      ).bind('old', 'Old').run()

      // Get the category ID
      const category = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?')
        .bind('old')
        .first<{ id: number }>()

      // Link repository to registry and category
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO registry_repositories (registry_name, repository_id, title)
           VALUES (?, ?, ?)`,
        ).bind(registryName, repo!.id, 'Abandoned Project'),
        env.DB.prepare(
          `INSERT INTO registry_repository_categories (registry_name, repository_id, category_id)
           VALUES (?, ?, ?)`,
        ).bind(registryName, repo!.id, category!.id),
      ])

      const items = await env.DB.prepare(
        `SELECT r.archived
         FROM registry_repositories rr
         JOIN repositories r ON r.id = rr.repository_id
         WHERE r.archived = 1`,
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

      // Verify repositories (should be deduplicated)
      const repos = await env.DB.prepare(
        'SELECT * FROM repositories ORDER BY stars DESC',
      ).all()

      expect(repos.results).toHaveLength(4)

      // Verify junction table entries
      const junctionEntries = await env.DB.prepare(
        'SELECT * FROM registry_repositories WHERE registry_name = ?',
      )
        .bind(registryName)
        .all()

      expect(junctionEntries.results).toHaveLength(4)

      // Verify archived count
      const archivedRepos = await env.DB.prepare(
        `SELECT COUNT(*) as count
         FROM registry_repositories rr
         JOIN repositories r ON r.id = rr.repository_id
         WHERE rr.registry_name = ? AND r.archived = 1`,
      )
        .bind(registryName)
        .first<{ count: number }>()

      expect(archivedRepos?.count).toBe(1)

      // Verify archived project title
      const archivedProject = await env.DB.prepare(
        `SELECT rr.title
         FROM registry_repositories rr
         JOIN repositories r ON r.id = rr.repository_id
         WHERE rr.registry_name = ? AND r.archived = 1`,
      )
        .bind(registryName)
        .first<{ title: string }>()

      expect(archivedProject?.title).toBe('Archived Project')
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
      // Metadata records total items in the registry (2 items without repo_info)
      // But these items are skipped during indexing since they lack repo_info
      expect(metadata!.total_items).toBe(2)
      expect(metadata!.total_stars).toBe(0)

      // No repositories should be created for items without repo_info
      const repos = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM repositories',
      ).first<{ count: number }>()

      expect(repos!.count).toBe(0)

      // No junction table entries either
      const junctionEntries = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM registry_repositories WHERE registry_name = ?',
      )
        .bind(registryName)
        .first<{ count: number }>()

      expect(junctionEntries!.count).toBe(0)
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

      const count = await env.DB.prepare(
        `SELECT COUNT(*) as count
         FROM registry_repositories
         WHERE registry_name = ?`,
      )
        .bind(registryName)
        .first<{ count: number }>()

      expect(count!.count).toBe(0)
    })
  })

  describe('Repository Deduplication', () => {
    it('should not create duplicate repositories for same owner/name', async () => {
      const data = validRegistry as RegistryData

      // Index the same registry twice
      await indexRegistry(env.DB, 'test-registry', data)
      await indexRegistry(env.DB, 'test-registry', data)

      // Count unique repositories (should not have duplicates)
      const duplicates = await env.DB.prepare(
        `SELECT owner, name, COUNT(*) as count
         FROM repositories
         GROUP BY owner, name
         HAVING count > 1`,
      ).all()

      expect(duplicates.results).toHaveLength(0)

      // Verify each owner/name combination is unique
      const totalCount = await env.DB.prepare('SELECT COUNT(*) as count FROM repositories')
        .first<{ count: number }>()
      const uniqueCount = await env.DB.prepare(
        'SELECT COUNT(DISTINCT owner || "/" || name) as count FROM repositories WHERE owner IS NOT NULL AND name IS NOT NULL',
      )
        .first<{ count: number }>()

      expect(totalCount?.count).toBe(uniqueCount?.count)
    })

    it('should allow same repository in multiple registries', async () => {
      // Create a registry with gin-gonic/gin
      const registry1: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/registry1',
          source_repository_description: 'Test registry 1',
          title: 'Registry 1',
        },
        items: [
          {
            description: 'Go web framework',
            items: [
              {
                title: 'Gin',
                description: 'Go web framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'Web Frameworks',
          },
        ],
      }

      const registry2: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/registry2',
          source_repository_description: 'Test registry 2',
          title: 'Registry 2',
        },
        items: [
          {
            description: 'Go frameworks',
            items: [
              {
                title: 'Gin',
                description: 'Go web framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'Frameworks',
          },
        ],
      }

      await indexRegistry(env.DB, 'registry1', registry1)
      await indexRegistry(env.DB, 'registry2', registry2)

      // Should only have one repository entry
      const ginRepo = await env.DB.prepare(
        "SELECT id FROM repositories WHERE owner = 'gin-gonic' AND name = 'gin'",
      ).first<{ id: number }>()

      expect(ginRepo).toBeDefined()

      // Should have two junction table entries (one per registry)
      const junctionEntries = await env.DB.prepare(
        'SELECT * FROM registry_repositories WHERE repository_id = ?',
      ).bind(ginRepo!.id).all()

      expect(junctionEntries.results).toHaveLength(2)
    })

    it('should rebuild facets after indexing multiple registries', async () => {
      const registry1: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/registry1',
          source_repository_description: 'Test registry 1',
          title: 'Registry 1',
        },
        items: [
          {
            description: 'Go web framework',
            items: [
              {
                title: 'Gin',
                description: 'Go web framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'Web Frameworks',
          },
        ],
      }

      await indexRegistry(env.DB, 'registry1', registry1)
      await rebuildFacets(env.DB)

      const facets = await env.DB.prepare('SELECT * FROM repository_facets').all()
      expect(facets.results).toHaveLength(1)
      expect(facets.results[0].registry_name).toBe('registry1')
      expect(facets.results[0].language).toBe('Go')
      expect(facets.results[0].category_name).toBe('Web Frameworks')
    })

    it('should store multiple categories via junction table', async () => {
      // Create registry with same repo in 2 categories
      const data: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/multi-category',
          source_repository_description: 'Test multi-category',
          title: 'Multi-Category Registry',
        },
        items: [
          {
            description: 'Web Frameworks',
            items: [
              {
                title: 'Gin Web',
                description: 'Go web framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'Web Frameworks',
          },
          {
            description: 'HTTP Servers',
            items: [
              {
                title: 'Gin HTTP',
                description: 'HTTP server framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'HTTP Servers',
          },
        ],
      }

      await indexRegistry(env.DB, 'multi-category-registry', data)

      // Should have 1 registry_repositories entry (unique registry_name, repository_id)
      const regRepoResult = await env.DB.prepare(
        'SELECT * FROM registry_repositories WHERE registry_name = ?'
      ).bind('multi-category-registry').all()

      expect(regRepoResult.results).toHaveLength(1)

      // Should have 2 junction table entries (one per category)
      const junctionResult = await env.DB.prepare(
        'SELECT c.name FROM registry_repository_categories rrc JOIN categories c ON c.id = rrc.category_id WHERE rrc.registry_name = ?'
      ).bind('multi-category-registry').all()

      expect(junctionResult.results).toHaveLength(2)

      // Extract category names
      const categoryNames = junctionResult.results.map(r => r.name)
      expect(categoryNames).toContain('Web Frameworks')
      expect(categoryNames).toContain('HTTP Servers')
    })
  })

  describe('rebuildFacets', () => {
    it('should populate repository_facets from current data', async () => {
      const data = validRegistry as RegistryData
      await indexRegistry(env.DB, 'valid-registry', data)
      await rebuildFacets(env.DB)

      const facets = await env.DB.prepare('SELECT * FROM repository_facets').all()
      // validRegistry has 4 items; one is archived so facets should not include it
      expect(facets.results.length).toBeGreaterThan(0)
      // All facets should be for the valid-registry
      expect(facets.results.every(f => f.registry_name === 'valid-registry')).toBe(true)
    })

    it('should exclude archived repositories from facets', async () => {
      const data = validRegistry as RegistryData
      await indexRegistry(env.DB, 'valid-registry', data)
      await rebuildFacets(env.DB)

      // Get archived repos
      const archivedInFacets = await env.DB.prepare(
        `SELECT f.repository_id FROM repository_facets f
         JOIN repositories r ON r.id = f.repository_id
         WHERE r.archived = 1`,
      ).all()

      expect(archivedInFacets.results).toHaveLength(0)
    })

    it('should clear and rebuild on subsequent calls', async () => {
      const registry1: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/r1',
          source_repository_description: 'R1',
          title: 'R1',
        },
        items: [
          {
            description: 'Frameworks',
            items: [
              {
                title: 'Gin',
                description: 'Go framework',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'gin-gonic',
                  repo: 'gin',
                  stars: 50000,
                },
              },
            ],
            title: 'Web Frameworks',
          },
        ],
      }
      await indexRegistry(env.DB, 'r1', registry1)
      await rebuildFacets(env.DB)

      const firstCount = await env.DB.prepare('SELECT COUNT(*) as c FROM repository_facets').first<{ c: number }>()
      expect(firstCount!.c).toBe(1)

      // Rebuild again — count should stay the same (no duplication)
      await rebuildFacets(env.DB)

      const secondCount = await env.DB.prepare('SELECT COUNT(*) as c FROM repository_facets').first<{ c: number }>()
      expect(secondCount!.c).toBe(1)
    })

    it('should return empty facets when database is empty', async () => {
      await rebuildFacets(env.DB)

      const facets = await env.DB.prepare('SELECT COUNT(*) as c FROM repository_facets').first<{ c: number }>()
      expect(facets!.c).toBe(0)
    })
  })

  describe('Category Normalization at Index Time', () => {
    it('should store normalized category names (not raw names)', async () => {
      const data: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/norm',
          source_repository_description: 'Normalization test',
          title: 'Normalization Test',
        },
        items: [
          {
            description: 'raw misc category',
            items: [
              {
                title: 'Some Tool',
                description: 'A tool',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Go',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'example',
                  repo: 'tool',
                  stars: 100,
                },
              },
            ],
            title: 'Other',
          },
        ],
      }

      await indexRegistry(env.DB, 'norm-registry', data)

      const category = await env.DB.prepare(
        "SELECT name FROM categories WHERE name = 'Miscellaneous'",
      ).first<{ name: string }>()

      expect(category).toBeDefined()
      expect(category!.name).toBe('Miscellaneous')

      // Raw name "Other" should not exist
      const rawCategory = await env.DB.prepare(
        "SELECT name FROM categories WHERE name = 'Other'",
      ).first()

      expect(rawCategory).toBeNull()
    })

    it('should deduplicate categories with equivalent raw names (Utils + Utilities → Utilities)', async () => {
      const data: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/dedup',
          source_repository_description: 'Dedup test',
          title: 'Dedup Test',
        },
        items: [
          {
            description: 'Utils section',
            items: [
              {
                title: 'Repo A',
                description: 'A util',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'TypeScript',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'org',
                  repo: 'repo-a',
                  stars: 50,
                },
              },
            ],
            title: 'Utils',
          },
          {
            description: 'Utilities section',
            items: [
              {
                title: 'Repo B',
                description: 'Another util',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'TypeScript',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'org',
                  repo: 'repo-b',
                  stars: 60,
                },
              },
            ],
            title: 'Utilities',
          },
        ],
      }

      await indexRegistry(env.DB, 'dedup-registry', data)

      // Both "Utils" and "Utilities" normalize to "Utilities" — should be one row
      const categories = await env.DB.prepare(
        "SELECT name FROM categories WHERE name = 'Utilities'",
      ).all<{ name: string }>()

      expect(categories.results).toHaveLength(1)

      // Both repos should be linked to the single "Utilities" category
      const junctionEntries = await env.DB.prepare(
        `SELECT rrc.repository_id FROM registry_repository_categories rrc
         JOIN categories c ON c.id = rrc.category_id
         WHERE rrc.registry_name = ? AND c.name = 'Utilities'`,
      ).bind('dedup-registry').all()

      expect(junctionEntries.results).toHaveLength(2)
    })

    it('should normalize emoji-prefixed MCP category names', async () => {
      const data: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/mcp',
          source_repository_description: 'MCP test',
          title: 'MCP Test',
        },
        items: [
          {
            description: 'Finance tools',
            items: [
              {
                title: 'Finance Tool',
                description: 'A finance tool',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Python',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'org',
                  repo: 'finance-tool',
                  stars: 200,
                },
              },
            ],
            title: '💰 Finance & Fintech',
          },
        ],
      }

      await indexRegistry(env.DB, 'mcp-registry', data)

      // Emoji stripped + mapped to "Finance"
      const category = await env.DB.prepare(
        "SELECT name FROM categories WHERE name = 'Finance'",
      ).first<{ name: string }>()

      expect(category).toBeDefined()
      expect(category!.name).toBe('Finance')
    })

    it('should store normalized category names in repository_facets after rebuild', async () => {
      const data: RegistryData = {
        metadata: {
          last_updated: '2025-10-12T00:00:00Z',
          source_repository: 'test/facets',
          source_repository_description: 'Facets test',
          title: 'Facets Test',
        },
        items: [
          {
            description: 'ML tools',
            items: [
              {
                title: 'ML Lib',
                description: 'A machine learning library',
                children: [],
                repo_info: {
                  archived: false,
                  language: 'Python',
                  last_commit: '2025-10-10T00:00:00Z',
                  owner: 'ml-org',
                  repo: 'ml-lib',
                  stars: 5000,
                },
              },
            ],
            title: 'Artificial Intelligence',
          },
        ],
      }

      await indexRegistry(env.DB, 'ai-registry', data)
      await rebuildFacets(env.DB)

      const facet = await env.DB.prepare(
        'SELECT category_name FROM repository_facets WHERE registry_name = ?',
      ).bind('ai-registry').first<{ category_name: string }>()

      expect(facet).toBeDefined()
      expect(facet!.category_name).toBe('Machine Learning')
    })
  })
})
