/**
 * Registry repository
 * Handles registry data queries
 */

import type { Database } from '@/types/database'
import type { RegistryData, RegistryItem } from '@/types/registry'

import type { Kysely } from 'kysely'

/**
 * Get featured registries
 */
export async function getFeaturedRegistries(db: Kysely<Database>): Promise<
  {
    description: string
    editorial_badge: null | string
    featured: number
    featured_order: null | number
    name: string
    title: string
    total_items: number
    total_stars: number
  }[]
> {
  const results = await db
    .selectFrom('registry_featured')
    .innerJoin(
      'registry_metadata',
      'registry_featured.registry_name',
      'registry_metadata.registry_name',
    )
    .select([
      'registry_featured.registry_name as name',
      'registry_featured.featured',
      'registry_featured.featured_order',
      'registry_featured.editorial_badge',
      'registry_metadata.title',
      'registry_metadata.description',
      'registry_metadata.total_items',
      'registry_metadata.total_stars',
    ])
    .where('registry_featured.featured', '=', 1)
    .orderBy('registry_featured.featured_order', 'asc')
    .execute()

  return results
}

/**
 * Get full registry data with categories
 */
export async function getRegistryData(
  db: Kysely<Database>,
  registryName: string,
): Promise<RegistryData> {
  const metadata = await db
    .selectFrom('registry_metadata')
    .select(['title', 'description', 'last_updated', 'source_repository'])
    .where('registry_name', '=', registryName)
    .executeTakeFirst()

  if (!metadata) {
    throw new Error(`Registry not found: ${registryName}`)
  }

  const items = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select([
      'categories.name as category_name',
      'registry_repositories.title',
      'repositories.description',
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
      'repositories.language',
      'repositories.last_commit',
      'repositories.archived',
    ])
    .where('registry_repositories.registry_name', '=', registryName)
    .orderBy('repositories.stars', 'desc')
    .execute()

  const categoryMap = new Map<
    string,
    { description: string; items: RegistryItem[]; title: string }
  >()

  items.forEach(row => {
    const categoryName = row.category_name
    const item: RegistryItem = {
      children: [],
      description: row.description,
      title: row.title,
      repo_info: {
        archived: Boolean(row.archived),
        language: row.language,
        last_commit: row.last_commit || '',
        owner: row.owner,
        repo: row.name,
        stars: row.stars,
      },
    }

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        description: '',
        items: [],
        title: categoryName,
      })
    }

    const section = categoryMap.get(categoryName)
    if (section) {
      section.items.push(item)
    }
  })

  return {
    items: Array.from(categoryMap.values()),
    metadata: {
      last_updated: metadata.last_updated,
      source_repository: metadata.source_repository,
      source_repository_description: metadata.description || '',
      title: metadata.title,
    },
  }
}

/**
 * Get detailed information about a specific registry
 */
export async function getRegistryDetail(
  db: Kysely<Database>,
  name: string,
): Promise<null | {
  categories: string[]
  description: string
  languages: string[]
  last_updated: string
  source_repository: string
  title: string
  topRepos: {
    categories: string[]
    description: null | string
    language: null | string
    name: string
    owner: null | string
    stars: number
  }[]
  total_items: number
  total_stars: number
}> {
  const metadata = await db
    .selectFrom('registry_metadata')
    .select([
      'title',
      'description',
      'last_updated',
      'source_repository',
      'total_items',
      'total_stars',
    ])
    .where('registry_name', '=', name)
    .executeTakeFirst()

  if (!metadata) {
    return null
  }

  const topReposResults = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select([
      'repositories.description',
      'repositories.language',
      'repositories.name',
      'repositories.owner',
      'repositories.stars',
      'registry_repositories.title',
      'categories.name as category_name',
    ])
    .where('registry_repositories.registry_name', '=', name)
    .where('repositories.archived', '=', 0)
    .orderBy('repositories.stars', 'desc')
    .execute()

  const categoryResults = await db
    .selectFrom('registry_repository_categories')
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repository_categories.repository_id',
    )
    .select('categories.name')
    .where('registry_repository_categories.registry_name', '=', name)
    .where('repositories.archived', '=', 0)
    .distinct()
    .execute()

  const allCategories = categoryResults.map(r => r.name)

  const languageResults = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select('repositories.language')
    .where('registry_repositories.registry_name', '=', name)
    .where('repositories.archived', '=', 0)
    .where('repositories.language', 'is not', null)
    .distinct()
    .execute()

  const uniqueLanguages = new Set(
    languageResults.map(r => r.language).filter((l): l is string => l !== null),
  )

  const repoMap = new Map<
    string,
    {
      categories: Set<string>
      description: null | string
      language: null | string
      name: string
      owner: null | string
      stars: number
      title: string
    }
  >()

  for (const row of topReposResults) {
    const key = `${row.owner}/${row.name}`
    if (!repoMap.has(key)) {
      repoMap.set(key, {
        categories: new Set(),
        description: row.description,
        language: row.language,
        name: row.name,
        owner: row.owner,
        stars: row.stars,
        title: row.title,
      })
    }
    repoMap.get(key)?.categories.add(row.category_name)
  }

  const topRepos = Array.from(repoMap.values())
    .slice(0, 10)
    .map(r => ({
      categories: Array.from(r.categories).sort(),
      description: r.description,
      language: r.language,
      name: r.name,
      owner: r.owner,
      stars: r.stars,
    }))

  return {
    categories: allCategories.sort(),
    description: metadata.description,
    last_updated: metadata.last_updated,
    languages: Array.from(uniqueLanguages).sort(),
    source_repository: metadata.source_repository,
    title: metadata.title,
    topRepos,
    total_items: metadata.total_items,
    total_stars: metadata.total_stars,
  }
}

/**
 * Get all registry metadata
 */
export async function getRegistryMetadata(db: Kysely<Database>): Promise<
  {
    description: string
    last_updated: string
    registry_name: string
    source_repository: string
    title: string
    total_items: number
    total_stars: number
  }[]
> {
  const results = await db
    .selectFrom('registry_metadata')
    .select([
      'registry_name',
      'title',
      'description',
      'last_updated',
      'source_repository',
      'total_items',
      'total_stars',
    ])
    .execute()

  return results.sort((a, b) =>
    a.registry_name.localeCompare(b.registry_name),
  ) as {
    description: string
    last_updated: string
    registry_name: string
    source_repository: string
    title: string
    total_items: number
    total_stars: number
  }[]
}

/**
 * Get trending registries
 */
export async function getTrendingRegistries(
  db: Kysely<Database>,
  limit = 12,
): Promise<
  {
    description: string
    name: string
    starsGrowth: number
    title: string
    total_items: number
    total_stars: number
  }[]
> {
  const results = await db
    .selectFrom('registry_metadata')
    .select([
      'registry_name as name',
      'title',
      'description',
      'total_items',
      'total_stars',
      'last_updated',
    ])
    .orderBy('total_stars', 'desc')
    .orderBy('last_updated', 'desc')
    .limit(limit)
    .execute()

  return results.map(r => ({
    description: r.description,
    name: r.name,
    starsGrowth: Math.floor(r.total_stars / 100),
    title: r.title,
    total_items: r.total_items,
    total_stars: r.total_stars,
  }))
}
