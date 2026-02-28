/**
 * Shared test data seeding utilities for integration tests
 * Uses the many-to-many schema including category junction table
 */

import type { Kysely } from 'kysely'

import type { Database } from '@/types/database'

/**
 * Seed test data with the new many-to-many schema including category junction table
 * This is the canonical test data set used across all integration tests
 */
export async function seedTestData(db: Kysely<Database>) {
  // Insert categories
  await db
    .insertInto('categories')
    .values([
      { name: 'Web Frameworks', slug: 'web-frameworks' },
      { name: 'Testing', slug: 'testing' },
    ])
    .execute()

  // Get category IDs
  const categories = await db
    .selectFrom('categories')
    .select(['id', 'slug'])
    .execute()

  const categoryMap = new Map(categories.map(c => [c.slug, c.id]))
  const webFrameworksId = categoryMap.get('web-frameworks')!
  const testingId = categoryMap.get('testing')!

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
        registry_name: 'go',
        repository_id: ginId,
        title: 'Gin',
      },
      {
        registry_name: 'go',
        repository_id: echoId,
        title: 'Echo',
      },
      {
        registry_name: 'go',
        repository_id: testifyId,
        title: 'Testify',
      },
      {
        registry_name: 'python',
        repository_id: djangoId,
        title: 'Django',
      },
      {
        registry_name: 'python',
        repository_id: flaskId,
        title: 'Flask',
      },
    ])
    .execute()

  // Link categories via junction table
  await db
    .insertInto('registry_repository_categories')
    .values([
      {
        registry_name: 'go',
        repository_id: ginId,
        category_id: webFrameworksId,
      },
      {
        registry_name: 'go',
        repository_id: echoId,
        category_id: webFrameworksId,
      },
      {
        registry_name: 'go',
        repository_id: testifyId,
        category_id: testingId,
      },
      {
        registry_name: 'python',
        repository_id: djangoId,
        category_id: webFrameworksId,
      },
      {
        registry_name: 'python',
        repository_id: flaskId,
        category_id: webFrameworksId,
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

  // Seed repository_facets (denormalized, mirrors registry_repository_categories for non-archived repos)
  await db
    .insertInto('repository_facets')
    .values([
      { repository_id: ginId, registry_name: 'go', language: 'Go', category_name: 'Web Frameworks' },
      { repository_id: echoId, registry_name: 'go', language: 'Go', category_name: 'Web Frameworks' },
      { repository_id: testifyId, registry_name: 'go', language: 'Go', category_name: 'Testing' },
      { repository_id: djangoId, registry_name: 'python', language: 'Python', category_name: 'Web Frameworks' },
      // Flask is archived — excluded from facets
    ])
    .execute()
}
