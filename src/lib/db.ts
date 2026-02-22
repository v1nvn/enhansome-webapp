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
 * Note: Categories are now stored as JSON arrays, so this function
 * parses them and aggregates in application code.
 */
export async function getCategorySummaries(db: Kysely<Database>): Promise<
  {
    category: string
    count: number
    totalStars: number
  }[]
> {
  // Get all items with their categories and stars
  const results = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select(['registry_repositories.categories', 'repositories.stars'])
    .execute()

  // Aggregate categories from JSON arrays
  const categoryMap = new Map<string, { count: number; totalStars: number }>()

  for (const row of results) {
    let categories: string[] = []
    try {
      categories = JSON.parse(row.categories) as string[]
    } catch {
      continue // Skip invalid JSON
    }

    for (const category of categories) {
      const existing = categoryMap.get(category) ?? { count: 0, totalStars: 0 }
      existing.count++
      existing.totalStars += row.stars
      categoryMap.set(category, existing)
    }
  }

  // Convert to array and sort by count
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalStars: data.totalStars,
    }))
    .sort((a, b) => b.count - a.count)
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
 * Updated to use junction table
 */
export async function getLanguages(
  db: Kysely<Database>,
  registryName?: string,
): Promise<string[]> {
  if (registryName) {
    // When filtering by registry, we need to join first
    const results = await db
      .selectFrom('repositories')
      .innerJoin(
        'registry_repositories',
        'registry_repositories.repository_id',
        'repositories.id',
      )
      .select('repositories.language')
      .distinct()
      .where('repositories.language', 'is not', null)
      .where('registry_repositories.registry_name', '=', registryName)
      .orderBy('repositories.language', 'asc')
      .execute()

    return results
      .map(r => r.language)
      .filter((lang): lang is string => lang !== null)
  }

  // When no registry filter, query directly from repositories
  const results = await db
    .selectFrom('repositories')
    .select('language')
    .distinct()
    .where('language', 'is not', null)
    .orderBy('language', 'asc')
    .execute()

  return results
    .map(r => r.language)
    .filter((lang): lang is string => lang !== null)
}

/**
 * Get full registry data with categories
 * Categories are stored as JSON arrays and parsed in application code
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

  // Get all items for this registry via junction table
  const items = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select([
      'registry_repositories.categories',
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

  // Group items by categories (create an entry for each category)
  const categoryMap = new Map<
    string,
    { description: string; items: RegistryItem[]; title: string }
  >()

  items.forEach(row => {
    const { categories, ...itemData } = row

    // Parse categories JSON array
    let categoryList: string[] = []
    try {
      categoryList = JSON.parse(categories) as string[]
    } catch {
      categoryList = []
    }

    // Reconstruct RegistryItem format
    const item: RegistryItem = {
      children: [],
      description: itemData.description,
      title: itemData.title,
      repo_info: {
        archived: Boolean(itemData.archived),
        language: itemData.language,
        last_commit: itemData.last_commit || '',
        owner: itemData.owner,
        repo: itemData.name,
        stars: itemData.stars,
      },
    }

    // Add item to each category it belongs to
    for (const category of categoryList) {
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
 * Categories are stored as JSON arrays and parsed in application code
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

  // Get top repos by stars via junction table
  const topRepos = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select([
      'registry_repositories.title',
      'registry_repositories.categories',
      'repositories.description',
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
      'repositories.language',
    ])
    .where('registry_repositories.registry_name', '=', name)
    .where('repositories.archived', '=', 0)
    .orderBy('repositories.stars', 'desc')
    .limit(10)
    .execute()

  // Get all categories and parse/deduplicate them
  const categoriesResult = await db
    .selectFrom('registry_repositories')
    .select('categories')
    .where('registry_name', '=', name)
    .execute()

  const allCategories = new Set<string>()
  for (const row of categoriesResult) {
    try {
      const cats = JSON.parse(row.categories) as string[]
      cats.forEach(c => allCategories.add(c))
    } catch {
      // Skip invalid JSON
    }
  }

  // Get unique languages
  const languagesResult = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select('repositories.language')
    .distinct()
    .where('registry_repositories.registry_name', '=', name)
    .where('repositories.language', 'is not', null)
    .orderBy('repositories.language', 'asc')
    .execute()

  return {
    categories: Array.from(allCategories).sort(),
    description: metadata.description,
    last_updated: metadata.last_updated,
    languages: languagesResult
      .map(l => l.language)
      .filter((l): l is string => l !== null),
    source_repository: metadata.source_repository,
    title: metadata.title,
    topRepos: topRepos.map(r => {
      let categoryList: string[] = []
      try {
        categoryList = JSON.parse(r.categories) as string[]
      } catch {
        // Use empty array on parse error
      }
      return {
        categories: categoryList,
        description: r.description,
        language: r.language,
        name: r.name,
        owner: r.owner,
        stars: r.stars,
      }
    }),
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
 * Categories are stored as JSON arrays and parsed in application code
 */
export async function getRepoDetail(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<null | {
  categories: string[]
  description: null | string
  language: null | string
  lastCommit: null | string
  name: string
  owner: string
  registries: {
    name: string
  }[]
  registryName: string
  relatedRepos: {
    categories: string[]
    name: string
    owner: null | string
    stars: number
  }[]
  stars: number
}> {
  // First get the repository
  const repo = await db
    .selectFrom('repositories')
    .selectAll()
    .where('owner', '=', owner)
    .where('name', '=', name)
    .executeTakeFirst()

  if (!repo) {
    return null
  }

  // Get all registry associations
  const associations = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'registry_metadata',
      'registry_metadata.registry_name',
      'registry_repositories.registry_name',
    )
    .select([
      'registry_repositories.registry_name',
      'registry_repositories.categories',
    ])
    .where('repository_id', '=', repo.id)
    .execute()

  if (associations.length === 0) {
    return null
  }

  // Use first association for related-repos
  // (A repo can belong to multiple registries; we pick the first one)
  const primary = associations[0]

  // Parse categories from primary association
  let primaryCategories: string[] = []
  try {
    primaryCategories = JSON.parse(primary.categories) as string[]
  } catch {
    // Use empty array on parse error
  }

  // Get related repos from the primary registry (same repos, exclude current)
  const relatedRepos = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select([
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
      'registry_repositories.categories',
    ])
    .where('registry_repositories.registry_name', '=', primary.registry_name)
    .where('repositories.id', '!=', repo.id)
    .where('repositories.archived', '=', 0)
    .orderBy('repositories.stars', 'desc')
    .limit(6)
    .execute()

  return {
    categories: primaryCategories,
    description: repo.description,
    language: repo.language,
    lastCommit: repo.last_commit,
    name: repo.name,
    owner: repo.owner,
    registryName: primary.registry_name,
    stars: repo.stars,
    registries: associations.map(a => ({
      name: a.registry_name,
    })),
    relatedRepos: relatedRepos.map(r => {
      let cats: string[] = []
      try {
        cats = JSON.parse(r.categories) as string[]
      } catch {
        // Use empty array on parse error
      }
      return {
        categories: cats,
        name: r.name,
        owner: r.owner,
        stars: r.stars,
      }
    }),
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
 * Categories are parsed from JSON arrays for matching
 */
export async function getUseCaseCategoryCounts(db: Kysely<Database>): Promise<
  {
    categoryId: string
    count: number
  }[]
> {
  // Get all items with their text content for matching via junction table
  const items = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select([
      'registry_repositories.title',
      'repositories.description',
      'registry_repositories.categories',
      'repositories.language',
    ])
    .where('repositories.archived', '=', 0)
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
    // Parse categories from JSON array
    let categoryList: string[] = []
    try {
      categoryList = JSON.parse(item.categories) as string[]
    } catch {
      categoryList = []
    }

    // Use first category (or empty string if none) for matching
    const primaryCategory = categoryList[0] || ''

    const matchedCategories = categorizeItem(
      item.title,
      item.description,
      primaryCategory,
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
 * Categories are parsed from JSON arrays for matching
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
    categories: string[]
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

  // Get all items via junction table
  let query = db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .select([
      'repositories.id',
      'registry_repositories.registry_name',
      'registry_repositories.categories',
      'registry_repositories.title',
      'repositories.description',
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
      'repositories.language',
      'repositories.last_commit',
      'repositories.archived',
    ])
    .where('repositories.archived', '=', 0)

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
    query = query.where('repositories.language', 'in', patterns)
  }

  const items = await query
    .orderBy('repositories.stars', 'desc')
    .limit(limit + offset)
    .execute()

  // Filter items that match the use case category
  const matchedItems = items
    .filter(item => {
      // Parse categories from JSON array
      let categoryList: string[] = []
      try {
        categoryList = JSON.parse(item.categories) as string[]
      } catch {
        categoryList = []
      }

      // Use first category for matching
      const primaryCategory = categoryList[0] || ''

      const matchedCategories = categorizeItem(
        item.title,
        item.description,
        primaryCategory,
      )
      return matchedCategories.includes(categoryId)
    })
    .slice(offset, offset + limit)

  // Transform to result format
  return matchedItems.map(row => {
    let categoryList: string[] = []
    try {
      categoryList = JSON.parse(row.categories) as string[]
    } catch {
      categoryList = []
    }

    return {
      categories: categoryList,
      description: row.description,
      id: row.id,
      language: row.language,
      registry: row.registry_name,
      stars: row.stars,
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
  })
}

/**
 * Search registry items with filters
 * Categories are stored as JSON arrays and not filterable via SQL
 *
 * Returns unique repositories with all associated registries aggregated into an array.
 * Uses GROUP_CONCAT to collect all registries for each repo in a single query.
 */
export async function searchRepos(
  db: Kysely<Database>,
  params: {
    archived?: boolean
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
    categories: string[]
    id: number
    qualityScore?: number
    registries: string[]
  })[]
  hasMore: boolean
  nextCursor?: number
  total: number
}> {
  const {
    archived = false,
    cursor,
    language,
    limit = 20,
    minStars,
    q,
    registryName,
    sortBy = 'quality',
  } = params

  // Get total count (unique repos) using Kysely query builder
  let countQuery = db
    .selectFrom('repositories as r')
    .innerJoin('registry_repositories as rr', 'rr.repository_id', 'r.id')
    .select(eb => eb.fn.count('r.id').distinct().as('count'))

  if (registryName) {
    countQuery = countQuery.where('rr.registry_name', '=', registryName)
  }
  if (language) {
    countQuery = countQuery.where('r.language', '=', language)
  }
  if (archived) {
    countQuery = countQuery.where('r.archived', '=', 1)
  } else {
    countQuery = countQuery.where('r.archived', '=', 0)
  }
  if (minStars) {
    countQuery = countQuery.where('r.stars', '>=', minStars)
  }
  if (q) {
    const searchTerm = `%${q}%`
    countQuery = countQuery.where(eb =>
      eb.or([
        eb('r.name', 'like', searchTerm),
        eb('r.owner', 'like', searchTerm),
        eb('r.description', 'like', searchTerm),
      ]),
    )
  }

  const countResult = await countQuery.executeTakeFirst()
  const total = Number(countResult?.count ?? 0)

  // Main query - get unique repos with GROUP_CONCAT for registries
  // We need to execute a raw SQL query with GROUP_CONCAT, so we use a workaround:
  // We'll execute a compiled query directly

  interface DataRow {
    archived: number
    categories: string
    description: null | string
    id: number
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    registries: null | string
    stars: number
    title: string
  }

  // Determine sort column and direction
  let sortColumn = 'r.stars'
  let sortDirection = 'DESC'
  switch (sortBy) {
    case 'name':
      sortColumn = 'r.name'
      sortDirection = 'ASC'
      break
    case 'stars':
      sortColumn = 'r.stars'
      sortDirection = 'DESC'
      break
    case 'updated':
      sortColumn = 'r.last_commit'
      sortDirection = 'DESC'
      break
    case 'quality':
    default:
      sortColumn = 'r.stars'
      sortDirection = 'DESC'
      break
  }

  const offset = cursor ?? 0

  // Build a dynamic Kysely query for the main search
  // We'll select from a subquery that does the GROUP_CONCAT
  let mainQuery = db
    .selectFrom('repositories as r')
    .innerJoin('registry_repositories as rr', 'rr.repository_id', 'r.id')
    .select([
      'r.id',
      'r.owner',
      'r.name',
      'r.description',
      'r.stars',
      'r.language',
      'r.last_commit',
      'r.archived',
      'rr.title',
      'rr.categories',
      'rr.registry_name',
    ])

  // Apply the same filters
  if (registryName) {
    mainQuery = mainQuery.where('rr.registry_name', '=', registryName)
  }
  if (language) {
    mainQuery = mainQuery.where('r.language', '=', language)
  }
  if (archived) {
    mainQuery = mainQuery.where('r.archived', '=', 1)
  } else {
    mainQuery = mainQuery.where('r.archived', '=', 0)
  }
  if (minStars) {
    mainQuery = mainQuery.where('r.stars', '>=', minStars)
  }
  if (q) {
    const searchTerm = `%${q}%`
    mainQuery = mainQuery.where(eb =>
      eb.or([
        eb('r.name', 'like', searchTerm),
        eb('r.owner', 'like', searchTerm),
        eb('r.description', 'like', searchTerm),
      ]),
    )
  }

  // Execute the query to get all results (may have duplicates for multi-registry repos)
  // Limit to 500 to prevent fetching excessive results
  const allResults = await mainQuery.limit(500).execute()

  // Deduplicate by repository id and aggregate registries
  interface DataRowWithRegistry {
    archived: number
    categories: string
    description: null | string
    id: number
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    registry_name: string
    stars: number
    title: string
  }
  const repoMap = new Map<
    number,
    {
      data: Omit<DataRowWithRegistry, 'registry_name'>
      registries: Set<string>
    }
  >()

  for (const row of allResults as DataRowWithRegistry[]) {
    const existing = repoMap.get(row.id)
    const { registry_name: regName, ...dataWithoutRegistry } = row
    if (existing) {
      existing.registries.add(regName)
    } else {
      repoMap.set(row.id, {
        data: dataWithoutRegistry,
        registries: new Set([regName]),
      })
    }
  }

  // Convert map back to array
  const aggregatedRows = Array.from(repoMap.values()).map(r => ({
    archived: r.data.archived,
    categories: r.data.categories,
    description: r.data.description,
    id: r.data.id,
    language: r.data.language,
    last_commit: r.data.last_commit,
    name: r.data.name,
    owner: r.data.owner,
    stars: r.data.stars,
    title: r.data.title,
    registries:
      r.registries.size > 1
        ? Array.from(r.registries).sort().join(',')
        : r.registries.values().next().value || '',
  }))

  // Apply sorting (in-memory since we need to deduplicate first)
  const sortField = sortColumn.replace('r.', '')
  aggregatedRows.sort((a, b) => {
    const aVal = a[sortField as keyof DataRow]
    const bVal = b[sortField as keyof DataRow]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'DESC' ? bVal - aVal : aVal - bVal
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'DESC'
        ? bVal.localeCompare(aVal)
        : aVal.localeCompare(bVal)
    }
    return 0
  })

  // Apply offset/limit
  const paginatedRows = aggregatedRows.slice(offset, offset + limit + 1)
  const rows = paginatedRows.slice(0, limit) as DataRow[]

  const hasMore = paginatedRows.length > limit
  const data = rows.map((r: DataRow) => {
    let categoryList: string[] = []
    try {
      categoryList = JSON.parse(r.categories) as string[]
    } catch {
      categoryList = []
    }
    return {
      categories: categoryList,
      description: r.description,
      id: r.id,
      registries: r.registries ? r.registries.split(',') : [],
      title: r.title,
      qualityScore: calculateQualityScore({
        last_commit: r.last_commit,
        stars: r.stars,
      }),
      owner: r.owner,
      name: r.name,
      stars: r.stars,
      language: r.language,
      last_commit: r.last_commit,
      archived: r.archived,
    }
  })

  // Transform to RegistryItem format
  const transformedItems = data.map(row => {
    const item: RegistryItem & {
      categories: string[]
      id: number
      qualityScore?: number
      registries: string[]
    } = {
      categories: row.categories,
      children: [],
      description: row.description,
      id: row.id,
      registries: row.registries,
      title: row.title,
      qualityScore: row.qualityScore,
      repo_info: {
        archived: Boolean(row.archived),
        language: row.language,
        last_commit: row.last_commit || '',
        owner: row.owner,
        repo: row.name,
        stars: row.stars,
      },
    }
    return item
  })

  // Post-sort by quality score if requested
  if (sortBy === 'quality') {
    transformedItems.sort(
      (a, b) => (b.qualityScore || 0) - (a.qualityScore || 0),
    )
  }

  return {
    data: transformedItems,
    hasMore,
    nextCursor: hasMore ? offset + limit : undefined,
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
