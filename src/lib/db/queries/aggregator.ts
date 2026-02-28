/**
 * Result aggregation utilities
 * Handles grouping and deduplication of query results
 */

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

export interface AggregatedRepository {
  archived: number
  categories: Set<string>
  description: null | string
  id: number
  language: null | string
  last_commit: null | string
  name: string
  owner: string
  registries: Set<string>
  stars: number
  title: string
}

export interface RepositoryRow {
  archived: number
  category_name: string
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

/**
 * Aggregate categories by registry_name from junction table
 */
export async function aggregateCategoriesByRegistry(
  db: Kysely<Database>,
): Promise<Map<string, Set<string>>> {
  const categoryRows = await db
    .selectFrom('registry_repository_categories')
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select(['registry_repository_categories.registry_name', 'categories.name'])
    .execute()

  const categoryMap = new Map<string, Set<string>>()
  for (const row of categoryRows) {
    if (!categoryMap.has(row.registry_name)) {
      categoryMap.set(row.registry_name, new Set<string>())
    }
    const registryCategories = categoryMap.get(row.registry_name)
    if (registryCategories) {
      registryCategories.add(row.name)
    }
  }

  return categoryMap
}

/**
 * Count unique repositories matching filters
 */
export async function countRepositories(
  db: Kysely<Database>,
  options?: {
    archived?: boolean
    language?: string
    minStars?: number
    registryName?: string
    searchQuery?: string
  },
): Promise<number> {
  const {
    archived = false,
    language,
    minStars,
    registryName,
    searchQuery,
  } = options || {}

  let query = db
    .selectFrom('repositories as r')
    .innerJoin('registry_repositories as rr', 'rr.repository_id', 'r.id')
    .select(eb => eb.fn.count('r.id').distinct().as('count'))

  if (registryName) {
    query = query.where('rr.registry_name', '=', registryName)
  }
  if (language) {
    query = query.where('r.language', '=', language)
  }
  if (archived) {
    query = query.where('r.archived', '=', 1)
  }
  if (minStars) {
    query = query.where('r.stars', '>=', minStars)
  }
  if (searchQuery) {
    const searchTerm = `%${searchQuery}%`
    query = query.where(eb =>
      eb.or([
        eb('r.name', 'like', searchTerm),
        eb('r.owner', 'like', searchTerm),
        eb('r.description', 'like', searchTerm),
      ]),
    )
  }

  const countResult = await query.executeTakeFirst()
  return Number(countResult?.count ?? 0)
}

/**
 * Group repository rows by ID and aggregate registries/categories
 */
export function groupRepositoriesById(
  rows: RepositoryRow[],
): Map<number, AggregatedRepository> {
  const repoMap = new Map<number, AggregatedRepository>()

  for (const row of rows) {
    const existing = repoMap.get(row.id)
    if (existing) {
      existing.registries.add(row.registry_name)
      existing.categories.add(row.category_name)
    } else {
      repoMap.set(row.id, {
        archived: row.archived,
        categories: new Set([row.category_name]),
        description: row.description,
        id: row.id,
        language: row.language,
        last_commit: row.last_commit,
        name: row.name,
        owner: row.owner,
        registries: new Set([row.registry_name]),
        stars: row.stars,
        title: row.title,
      })
    }
  }

  return repoMap
}

/**
 * Group repositories by owner/name key and aggregate categories
 */
export function groupRepositoriesByKey<
  T extends {
    category_name: string
    name: string
    owner: null | string
  },
>(rows: T[]): Map<string, { categories: Set<string>; row: T }> {
  const repoMap = new Map<string, { categories: Set<string>; row: T }>()

  for (const row of rows) {
    const key = `${row.owner}/${row.name}`
    if (!repoMap.has(key)) {
      repoMap.set(key, {
        categories: new Set(),
        row,
      })
    }
    const existing = repoMap.get(key)
    if (existing) {
      existing.categories.add(row.category_name)
    }
  }

  return repoMap
}

/**
 * Convert Sets to sorted arrays
 */
export function setsToStrings<T>(map: Map<string, Set<T>>): Map<string, T[]> {
  const result = new Map<string, T[]>()
  for (const [key, set] of map.entries()) {
    result.set(key, Array.from(set).sort())
  }
  return result
}
