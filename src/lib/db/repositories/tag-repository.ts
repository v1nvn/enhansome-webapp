/**
 * Tag repository
 * Handles tag queries for filtering and display
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

interface TagWithCount {
  count: number
  name: string
  slug: string
}

/**
 * Get top tags globally across all registries
 * Uses repository_facets for efficient counting
 */
export async function getGlobalTopTags(
  db: Kysely<Database>,
  limit = 50,
): Promise<TagWithCount[]> {
  const results = await db
    .selectFrom('repository_facets as f')
    .innerJoin('tags as t', 't.name', 'f.tag_name')
    .select([
      't.name',
      't.slug',
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .groupBy(['t.name', 't.slug'])
    .orderBy(sql`count`, 'desc')
    .orderBy('t.name', 'asc')
    .limit(limit)
    .execute()

  return results.map(r => ({
    count: r.count,
    name: r.name,
    slug: r.slug,
  }))
}
