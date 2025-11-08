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
    sortBy?: 'name' | 'stars' | 'updated'
  },
): Promise<{
  data: (RegistryItem & { category: string; id: number; registry: string })[]
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
  const items = hasMore ? results.slice(0, limit) : results

  // Transform to RegistryItem format
  const transformedItems = items.map(row => {
    const item: RegistryItem & {
      category: string
      id: number
      registry: string
    } = {
      category: row.category,
      children: [],
      description: row.description,
      id: row.id,
      registry: row.registry_name,
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
    }
    return item
  })

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
