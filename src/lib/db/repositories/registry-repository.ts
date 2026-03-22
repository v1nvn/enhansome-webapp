/**
 * Registry repository
 * Handles registry data queries
 */

import { sql } from 'kysely'

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
 * Uses registry_repositories_fts - one row per (repo, registry, category)
 * Results are pre-sorted by category, no split needed
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

  // Query registry_repositories_fts - results already sorted by category
  const escapedName = registryName.replace(/'/g, "''")
  const itemsResult = await sql<{
    archived: number
    category_name: string
    description: null | string
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    repository_id: number
    stars: number
    tag_names: string
    title: string
  }>`
    SELECT owner, name, description, language, stars, last_commit, archived,
           category_name, title, tag_names, repository_id
    FROM registry_repositories_fts
    WHERE registry_name = ${sql.raw(`'${escapedName}'`)}
    ORDER BY category_name ASC, stars DESC
  `.execute(db)

  // Build categoryMap by iterating pre-sorted results (no split needed)
  const categoryMap = new Map<
    string,
    { description: string; items: RegistryItem[]; title: string }
  >()

  for (const row of itemsResult.rows) {
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

    if (!categoryMap.has(row.category_name)) {
      categoryMap.set(row.category_name, {
        description: '',
        items: [],
        title: row.category_name,
      })
    }

    const section = categoryMap.get(row.category_name)
    if (section) {
      section.items.push(item)
    }
  }

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
 * Uses registry_repositories_fts - native SQL for distinct values, no in-memory Sets
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
  tags: { count: number; name: string }[]
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

  const escapedName = name.replace(/'/g, "''")

  // Unique categories - native SQL DISTINCT
  const categoriesResult = await sql<{ category_name: string }>`
    SELECT DISTINCT category_name
    FROM registry_repositories_fts
    WHERE registry_name = ${sql.raw(`'${escapedName}'`)} AND archived = 0
    ORDER BY category_name
  `.execute(db)

  // Unique languages - native SQL DISTINCT
  const languagesResult = await sql<{ language: string }>`
    SELECT DISTINCT language
    FROM registry_repositories_fts
    WHERE registry_name = ${sql.raw(`'${escapedName}'`)} AND archived = 0 AND language IS NOT NULL
    ORDER BY language
  `.execute(db)

  // Top repos - GROUP BY to dedupe by repository_id
  const topReposResult = await sql<{
    categories: string
    description: null | string
    language: null | string
    name: string
    owner: string
    stars: number
  }>`
    SELECT
      repository_id,
      owner,
      name,
      description,
      language,
      stars,
      GROUP_CONCAT(DISTINCT category_name) as categories
    FROM registry_repositories_fts
    WHERE registry_name = ${sql.raw(`'${escapedName}'`)} AND archived = 0
    GROUP BY repository_id
    ORDER BY stars DESC
    LIMIT 10
  `.execute(db)

  const topRepos = topReposResult.rows.map(r => ({
    categories: r.categories ? r.categories.split(',').sort() : [],
    description: r.description,
    language: r.language,
    name: r.name,
    owner: r.owner,
    stars: r.stars,
  }))

  // Get top tags for this registry (already efficient on repository_facets)
  const tagResults = await db
    .selectFrom('repository_facets as f')
    .select([
      'f.tag_name as name',
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .where('f.registry_name', '=', name)
    .groupBy('f.tag_name')
    .orderBy(sql`count`, 'desc')
    .limit(50)
    .execute()

  const tags = tagResults.map(r => ({
    count: r.count,
    name: r.name,
  }))

  return {
    categories: categoriesResult.rows.map(r => r.category_name),
    description: metadata.description,
    last_updated: metadata.last_updated,
    languages: languagesResult.rows.map(r => r.language),
    source_repository: metadata.source_repository,
    tags,
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
