/**
 * Statistics repository
 * Handles aggregate statistics queries
 */

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

/**
 * Get statistics for all registries in a single query
 * Note: No ORDER BY - sorting happens client-side when building result maps
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

  const languageResults = await db
    .selectFrom('repositories')
    .innerJoin(
      'registry_repositories',
      'registry_repositories.repository_id',
      'repositories.id',
    )
    .select(['registry_repositories.registry_name', 'repositories.language'])
    .distinct()
    .where('repositories.language', 'is not', null)
    .execute()

  const languageMap = new Map<string, string[]>()
  for (const row of languageResults) {
    const existing = languageMap.get(row.registry_name)
    if (existing) {
      if (row.language && !existing.includes(row.language)) {
        existing.push(row.language)
      }
    } else {
      languageMap.set(row.registry_name, row.language ? [row.language] : [])
    }
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
    const languages = languageMap.get(metadata.registry_name) ?? []
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
