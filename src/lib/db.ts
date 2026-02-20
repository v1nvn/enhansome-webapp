/**
 * Kysely database client for querying Cloudflare D1
 * This file provides helper functions for the webapp to query the registry database
 */

import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'

import type { Database } from '@/types/database'
import type { RegistryData, RegistryItem } from '@/types/registry'

import type { D1Database } from '@cloudflare/workers-types'

/**
 * Create Kysely instance from D1 database binding
 */
export function createKysely(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  })
}

/**
 * Get category summaries across all registries
 */
export async function getCategorySummaries(db: Kysely<Database>): Promise<
  {
    category: string
    count: number
    totalStars: number
  }[]
> {
  interface CategorySummariesRow {
    category: string
    count: number | string
    totalStars: null | number | string
  }

  const results = await db
    .selectFrom('registry_items')
    .select([
      'category',
      eb => eb.fn.count('id').as('count'),
      eb => eb.fn.sum('stars').as('totalStars'),
    ])
    .groupBy('category')
    .orderBy(eb => eb.fn.count('id'), 'desc')
    .execute()

  return results.map(r => {
    const row = r as unknown as CategorySummariesRow
    return {
      category: row.category,
      count:
        typeof row.count === 'string'
          ? Number.parseInt(row.count, 10)
          : row.count,
      totalStars:
        row.totalStars === null
          ? 0
          : typeof row.totalStars === 'string'
            ? Number.parseInt(row.totalStars, 10)
            : row.totalStars,
    }
  })
}

/**
 * Get featured registries with editorial badges and ordering
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
 * Get unique languages across all or specific registry
 */
export async function getLanguages(
  db: Kysely<Database>,
  registryName?: string,
): Promise<string[]> {
  let query = db
    .selectFrom('registry_items')
    .select('language')
    .distinct()
    .where('language', 'is not', null)

  if (registryName) {
    query = query.where('registry_name', '=', registryName)
  }

  const results = await query.orderBy('language', 'asc').execute()

  return results
    .map(r => r.language)
    .filter((lang): lang is string => lang !== null)
}

/**
 * Get full registry data grouped by categories
 * Maintains compatibility with existing frontend structure
 */
export async function getRegistryData(
  db: Kysely<Database>,
  registryName: string,
): Promise<RegistryData> {
  // Get metadata
  const metadata = await db
    .selectFrom('registry_metadata')
    .select(['title', 'description', 'last_updated', 'source_repository'])
    .where('registry_name', '=', registryName)
    .executeTakeFirst()

  if (!metadata) {
    throw new Error(`Registry not found: ${registryName}`)
  }

  // Get all items for this registry
  const items = await db
    .selectFrom('registry_items')
    .select([
      'category',
      'title',
      'description',
      'repo_owner',
      'repo_name',
      'stars',
      'language',
      'last_commit',
      'archived',
    ])
    .where('registry_name', '=', registryName)
    .orderBy('category', 'asc')
    .orderBy('stars', 'desc')
    .execute()

  // Group items by category
  const categoryMap = new Map<
    string,
    { description: string; items: RegistryItem[]; title: string }
  >()

  items.forEach(row => {
    const { category, ...itemData } = row

    // Reconstruct RegistryItem format
    const item: RegistryItem = {
      children: [],
      description: itemData.description,
      title: itemData.title,
      ...(itemData.repo_owner && itemData.repo_name
        ? {
            repo_info: {
              archived: Boolean(itemData.archived),
              language: itemData.language,
              last_commit: itemData.last_commit || '',
              owner: itemData.repo_owner,
              repo: itemData.repo_name,
              stars: itemData.stars,
            },
          }
        : {}),
    }

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        description: '',
        items: [],
        title: category,
      })
    }

    const section = categoryMap.get(category)
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
    category: string
    description: null | string
    language: null | string
    name: string
    owner: null | string
    stars: number
  }[]
  total_items: number
  total_stars: number
}> {
  // Get metadata
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

  // Get top repos by stars
  const topRepos = await db
    .selectFrom('registry_items')
    .select([
      'title',
      'description',
      'repo_owner',
      'repo_name',
      'stars',
      'language',
      'category',
    ])
    .where('registry_name', '=', name)
    .where('archived', '=', 0)
    .orderBy('stars', 'desc')
    .limit(10)
    .execute()

  // Get unique categories
  const categoriesResult = await db
    .selectFrom('registry_items')
    .select('category')
    .distinct()
    .where('registry_name', '=', name)
    .orderBy('category', 'asc')
    .execute()

  // Get unique languages
  const languagesResult = await db
    .selectFrom('registry_items')
    .select('language')
    .distinct()
    .where('registry_name', '=', name)
    .where('language', 'is not', null)
    .orderBy('language', 'asc')
    .execute()

  return {
    categories: categoriesResult.map(c => c.category),
    description: metadata.description,
    last_updated: metadata.last_updated,
    languages: languagesResult
      .map(l => l.language)
      .filter((l): l is string => l !== null),
    source_repository: metadata.source_repository,
    title: metadata.title,
    topRepos: topRepos.map(r => ({
      category: r.category,
      description: r.description,
      language: r.language,
      name: r.repo_name ?? r.title,
      owner: r.repo_owner,
      stars: r.stars,
    })),
    total_items: metadata.total_items,
    total_stars: metadata.total_stars,
  }
}

/**
 * Get all registry metadata (for listing registries)
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
    .orderBy('registry_name', 'asc')
    .execute()

  return results as {
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
 * Get statistics for a specific registry
 */
export async function getRegistryStats(
  db: Kysely<Database>,
  registryName: string,
): Promise<{
  languages: string[]
  latestUpdate: string
  totalRepos: number
  totalStars: number
}> {
  const metadata = await db
    .selectFrom('registry_metadata')
    .select(['total_items', 'total_stars', 'last_updated'])
    .where('registry_name', '=', registryName)
    .executeTakeFirst()

  const languages = await getLanguages(db, registryName)

  return {
    languages,
    latestUpdate: metadata?.last_updated ?? '',
    totalRepos: metadata?.total_items ?? 0,
    totalStars: metadata?.total_stars ?? 0,
  }
}

/**
 * Get detailed information about a specific repository
 */
export async function getRepoDetail(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<null | {
  category: string
  description: null | string
  language: null | string
  lastCommit: null | string
  name: string
  owner: string
  registryName: string
  relatedRepos: {
    category: string
    name: string
    owner: null | string
    stars: number
  }[]
  stars: number
}> {
  // Get the repo
  const repo = await db
    .selectFrom('registry_items')
    .select([
      'id',
      'registry_name',
      'title',
      'description',
      'repo_owner',
      'repo_name',
      'stars',
      'language',
      'category',
      'last_commit',
    ])
    .where('repo_owner', '=', owner)
    .where('repo_name', '=', name)
    .executeTakeFirst()

  if (!repo) {
    return null
  }

  // Get related repos (same category and registry, excluding current)
  const relatedRepos = await db
    .selectFrom('registry_items')
    .select(['title', 'repo_owner', 'repo_name', 'stars', 'category'])
    .where('category', '=', repo.category)
    .where('registry_name', '=', repo.registry_name)
    .where('id', '!=', repo.id)
    .where('archived', '=', 0)
    .where(eb =>
      eb.or([
        eb('repo_owner', 'is not', null),
        eb('repo_name', 'is not', null),
      ]),
    )
    .orderBy('stars', 'desc')
    .limit(6)
    .execute()

  return {
    category: repo.category,
    description: repo.description,
    language: repo.language,
    lastCommit: repo.last_commit,
    name: repo.repo_name ?? repo.title,
    owner: repo.repo_owner ?? '',
    registryName: repo.registry_name,
    stars: repo.stars,
    relatedRepos: relatedRepos.map(r => ({
      category: r.category,
      name: r.repo_name ?? r.title,
      owner: r.repo_owner,
      stars: r.stars,
    })),
  }
}

/**
 * Get trending registries based on recent activity
 * Calculated by total_stars and last_updated
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
  // Calculate "trending" as a combination of high star count and recent updates
  // This is a simple approximation - for true trending we'd need historical data
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

  // Calculate a simple "growth score" based on stars
  return results.map(r => ({
    description: r.description,
    name: r.name,
    starsGrowth: Math.floor(r.total_stars / 100), // Simple growth metric
    title: r.title,
    total_items: r.total_items,
    total_stars: r.total_stars,
  }))
}

/**
 * Get use case category counts across all registries
 * Matches items to categories based on keyword matching
 */
export async function getUseCaseCategoryCounts(db: Kysely<Database>): Promise<
  {
    categoryId: string
    count: number
  }[]
> {
  // Get all items with their text content for matching
  const items = await db
    .selectFrom('registry_items')
    .select(['title', 'description', 'category', 'language'])
    .where('archived', '=', 0)
    .execute()

  // Import categorization function
  const { categorizeItem, getAllCategories } = await import(
    './use-case-categories'
  )

  const categories = getAllCategories()
  const categoryCounts = new Map<string, number>()

  // Initialize counts
  for (const cat of categories) {
    categoryCounts.set(cat.id, 0)
  }

  // Count items per use case category
  for (const item of items) {
    const matchedCategories = categorizeItem(
      item.title,
      item.description,
      item.category,
    )
    for (const catId of matchedCategories) {
      categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1)
    }
  }

  // Convert to array and sort by count
  return Array.from(categoryCounts.entries())
    .map(([categoryId, count]) => ({ categoryId, count }))
    .filter(c => c.count > 0) // Only return categories with items
    .sort((a, b) => b.count - a.count)
}

/**
 * Get items for a specific use case category
 */
export async function getUseCaseCategoryItems(
  db: Kysely<Database>,
  categoryId: string,
  options?: {
    framework?: string
    limit?: number
    offset?: number
  },
): Promise<
  {
    category: string
    description: null | string
    id: number
    language: null | string
    registry: string
    repo_info?: {
      archived: boolean
      language: null | string
      last_commit: string
      owner: string
      repo: string
      stars: number
    }
    stars: number
    title: string
  }[]
> {
  const { limit = 50, offset = 0, framework } = options || {}

  // Get the category definition
  const { getCategoryById, categorizeItem } = await import(
    './use-case-categories'
  )
  const categoryDef = getCategoryById(categoryId)

  if (!categoryDef) {
    return []
  }

  // Get all items
  let query = db
    .selectFrom('registry_items')
    .select([
      'id',
      'registry_name',
      'category',
      'title',
      'description',
      'repo_owner',
      'repo_name',
      'stars',
      'language',
      'last_commit',
      'archived',
    ])
    .where('archived', '=', 0)

  // Apply framework filter if specified
  if (framework && framework !== 'all') {
    // Map framework to language patterns
    const frameworkPatterns: Record<string, string[]> = {
      react: ['typescript', 'javascript'],
      vue: ['vue', 'typescript'],
      svelte: ['svelte'],
      angular: ['angular', 'typescript'],
      solid: ['solid'],
      qwik: ['qwik'],
    }

    const patterns = frameworkPatterns[framework]
    query = query.where('language', 'in', patterns)
  }

  const items = await query
    .orderBy('stars', 'desc')
    .limit(limit + offset)
    .execute()

  // Filter items that match the use case category
  const matchedItems = items
    .filter(item => {
      const matchedCategories = categorizeItem(
        item.title,
        item.description,
        item.category,
      )
      return matchedCategories.includes(categoryId)
    })
    .slice(offset, offset + limit)

  // Transform to result format
  return matchedItems.map(row => ({
    category: row.category,
    description: row.description,
    id: row.id,
    language: row.language,
    registry: row.registry_name,
    stars: row.stars,
    title: row.title,
    ...(row.repo_owner && row.repo_name
      ? {
          repo_info: {
            archived: Boolean(row.archived),
            language: row.language,
            last_commit: row.last_commit || '',
            owner: row.repo_owner,
            repo: row.repo_name,
            stars: row.stars,
          },
        }
      : {}),
  }))
}

/**
 * Search registry items with filters
 */
export async function searchRegistryItems(
  db: Kysely<Database>,
  params: {
    archived?: boolean
    category?: string
    cursor?: number
    language?: string
    limit?: number
    minStars?: number
    q?: string
    registryName?: string
    sortBy?: 'name' | 'quality' | 'stars' | 'updated'
  },
): Promise<{
  data: (RegistryItem & {
    category: string
    id: number
    qualityScore?: number
    registry: string
  })[]
  hasMore: boolean
  nextCursor?: number
  total: number
}> {
  const {
    archived,
    category,
    cursor,
    language,
    limit = 20,
    minStars,
    q,
    registryName,
    sortBy = 'stars',
  } = params

  // Build query
  let query = db.selectFrom('registry_items')

  // Apply filters
  if (registryName) {
    query = query.where('registry_name', '=', registryName)
  }

  if (category) {
    query = query.where('category', '=', category)
  }

  if (language) {
    query = query.where('language', '=', language)
  }

  if (minStars !== undefined) {
    query = query.where('stars', '>=', minStars)
  }

  if (archived !== undefined) {
    query = query.where('archived', '=', archived ? 1 : 0)
  }

  // Simple text search (no FTS)
  // Escape special LIKE characters to prevent SQL injection
  if (q?.trim()) {
    const escapedQuery = q.trim().replace(/[%_\\]/g, '\\$&') // Escape %, _, and \ characters
    const searchTerm = `%${escapedQuery}%`
    query = query.where(eb =>
      eb.or([
        eb('title', 'like', searchTerm),
        eb('description', 'like', searchTerm),
        eb('category', 'like', searchTerm),
      ]),
    )
  }

  // Get total count
  const countResult = await query
    .select(eb => eb.fn.count<number>('id').as('total'))
    .executeTakeFirst()
  const total = countResult?.total || 0

  // Apply cursor-based pagination
  if (cursor !== undefined) {
    query = query.where('id', '>', cursor)
  }

  // Apply sorting
  switch (sortBy) {
    case 'name':
      query = query.orderBy('title', 'asc').orderBy('id', 'asc')
      break
    case 'quality':
      // Quality score is computed post-fetch, so we use stars as base
      // Results will be re-sorted after transformation
      query = query.orderBy('stars', 'desc').orderBy('last_commit', 'desc')
      break
    case 'updated':
      query = query.orderBy('last_commit', 'desc').orderBy('id', 'asc')
      break
    case 'stars':
    default:
      query = query.orderBy('stars', 'desc').orderBy('id', 'asc')
      break
  }

  // Fetch limit + 1 to check if there are more results
  const results = await query
    .select([
      'id',
      'registry_name',
      'category',
      'title',
      'description',
      'repo_owner',
      'repo_name',
      'stars',
      'language',
      'last_commit',
      'archived',
    ])
    .limit(limit + 1)
    .execute()

  // Check if there are more results
  const hasMore = results.length > limit
  const rawItems = hasMore ? results.slice(0, limit) : results

  // Transform to RegistryItem format with quality score
  const transformedItems = rawItems.map(row => {
    const item: RegistryItem & {
      category: string
      id: number
      qualityScore?: number
      registry: string
    } = {
      category: row.category,
      children: [],
      description: row.description,
      id: row.id,
      registry: row.registry_name,
      title: row.title,
      qualityScore: calculateQualityScore({
        last_commit: row.last_commit,
        stars: row.stars,
      }),
      ...(row.repo_owner && row.repo_name
        ? {
            repo_info: {
              archived: Boolean(row.archived),
              language: row.language,
              last_commit: row.last_commit || '',
              owner: row.repo_owner,
              repo: row.repo_name,
              stars: row.stars,
            },
          }
        : {}),
    }
    return item
  })

  // Post-sort by quality score if requested
  if (sortBy === 'quality') {
    transformedItems.sort(
      (a, b) => (b.qualityScore || 0) - (a.qualityScore || 0),
    )
  }

  // Get the next cursor (last item's id)
  const nextCursor =
    hasMore && transformedItems.length > 0
      ? transformedItems[transformedItems.length - 1]?.id
      : undefined

  return {
    data: transformedItems,
    hasMore,
    nextCursor,
    total,
  }
}

/**
 * Calculate composite quality score for ranking search results
 *
 * quality_score = (
 *     log(stars) × 1.0 +
 *     freshness_factor × 0.5 +
 *     activity_factor × 0.3
 * )
 *
 * Where:
 *   freshness_factor = days_since_commit / 365 (clamped 0-1, reversed so newer is better)
 *   activity_factor = min(commits_in_last_90_days / 100, 1) (estimated from last_commit recency)
 */
function calculateQualityScore(item: {
  last_commit: null | string
  stars: number
}): number {
  const stars = item.stars || 0
  const lastCommit = item.last_commit

  // Logarithmic stars score (diminishing returns for very high counts)
  const starsScore = Math.log10(Math.max(stars, 1))

  // Freshness factor based on last commit date
  let freshnessScore = 0
  if (lastCommit) {
    const commitDate = new Date(lastCommit)
    const daysSinceCommit = Math.max(
      0,
      (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    // Convert to 0-1 scale, where 1 = very recent (0 days), 0 = very old (365+ days)
    freshnessScore = Math.max(0, 1 - daysSinceCommit / 365)
  }

  // Activity factor (estimated from freshness - more recent commits = more active)
  // This is a simplified approximation since we don't have commit frequency data
  const activityScore = freshnessScore * 0.8

  // Composite score
  return starsScore * 1.0 + freshnessScore * 0.5 + activityScore * 0.3
}
