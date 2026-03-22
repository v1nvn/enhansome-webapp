/**
 * Statistics repository
 * Handles aggregate statistics queries
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

/**
 * Get statistics for all registries in a single query
 * Uses registry_repositories_fts - no SUBSTR hack, no split, no in-memory aggregation
 */
export async function getAllRegistryStatsBatched(db: Kysely<Database>): Promise<
  Map<
    string,
    {
      languages: string[]
      latestUpdate: string
      totalRepos: number
      totalStars: number
    }
  >
> {
  const metadataList = await db
    .selectFrom('registry_metadata')
    .select(['registry_name', 'total_items', 'total_stars', 'last_updated'])
    .execute()

  // Use registry_repositories_fts - one row per (repo, registry, category)
  // registry_name is a single value, no comma-sep, no SUBSTR hack needed
  const languageResults = await sql<{
    language: string
    registry_name: string
  }>`
    SELECT DISTINCT registry_name, language
    FROM registry_repositories_fts
    WHERE language IS NOT NULL
    ORDER BY registry_name, language
  `.execute(db)

  const languageMap = new Map<string, Set<string>>()
  for (const row of languageResults.rows) {
    if (!row.registry_name || !row.language) continue

    if (!languageMap.has(row.registry_name)) {
      languageMap.set(row.registry_name, new Set())
    }
    languageMap.get(row.registry_name)?.add(row.language)
  }

  const result = new Map<
    string,
    {
      languages: string[]
      latestUpdate: string
      totalRepos: number
      totalStars: number
    }
  >()

  for (const metadata of metadataList) {
    const languages = Array.from(languageMap.get(metadata.registry_name) ?? [])
    result.set(metadata.registry_name, {
      languages: languages.sort(),
      latestUpdate: metadata.last_updated,
      totalRepos: metadata.total_items,
      totalStars: metadata.total_stars,
    })
  }

  return result
}

/**
 * Get category summaries across all registries
 * Note: Uses base tables with joins for accurate counting by registry
 * FTS table is not suitable here because it flattens data into comma-separated fields
 */
export async function getCategorySummaries(db: Kysely<Database>): Promise<
  {
    category: string
    count: number
    totalStars: number
  }[]
> {
  const results = await db
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
    .select([
      'categories.name as category',
      eb =>
        eb.fn.count('registry_repository_categories.repository_id').as('count'),
      eb => eb.fn.sum('repositories.stars').as('totalStars'),
    ])
    .groupBy('categories.name')
    .orderBy('count', 'desc')
    .execute()

  return results.map(row => ({
    category: row.category,
    count: Number(row.count),
    totalStars: Number(row.totalStars),
  }))
}
