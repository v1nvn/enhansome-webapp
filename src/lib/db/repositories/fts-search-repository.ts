/**
 * FTS5 Search Repository
 * Full-text search with natural language queries and filter suggestions
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'

import { calculateQualityScore } from '../../utils/scoring'

import type { Kysely } from 'kysely'

export interface FtsSearchParams {
  /** Filter to specific category */
  category?: string
  /** Pagination cursor (repository id) */
  cursor?: number
  /** Filter by programming language */
  language?: string
  /** Max results (default 20, max 50) */
  limit?: number
  /** Minimum GitHub stars */
  minStars?: number
  /** Natural language search query */
  query: string
  /** Filter to specific registry */
  registry?: string
  /** Filter to specific tag */
  tag?: string
}

export interface FtsSearchResult {
  hasMore: boolean
  nextCursor?: number
  repositories: {
    categories: string[]
    description: null | string
    id: number
    qualityScore: number
    registries: string[]
    repo_info: {
      archived: boolean
      language: null | string
      last_commit: string
      owner: string
      repo: string
      stars: number
    }
    tags: string[]
    title: string
  }[]
  suggestions?: {
    categories: string[]
    registries: string[]
  }
  total: number
}

interface FtsRow {
  archived: number
  category_names: string
  description: null | string
  language: null | string
  last_commit: null | string
  name: string
  owner: string
  rank: number
  registry_names: string
  rowid: number
  stars: number
  tag_names: string
}

/**
 * Search repositories using FTS5 full-text search
 * Returns natural language search results with relevance ranking
 */
export async function ftsSearch(
  db: Kysely<Database>,
  params: FtsSearchParams,
): Promise<FtsSearchResult> {
  const {
    query,
    registry,
    category,
    tag,
    language,
    minStars,
    limit = 20,
    cursor,
  } = params

  const ftsQuery = sanitizeFtsQuery(query)

  // Build additional filter conditions
  const filters: string[] = ['archived = 0']
  if (registry) filters.push(`registry_names LIKE '%${registry}%'`)
  if (category) filters.push(`category_names LIKE '%${category}%'`)
  if (tag) filters.push(`tag_names LIKE '%${tag}%'`)
  if (language) filters.push(`language = '${language}'`)
  if (minStars !== undefined) filters.push(`stars >= ${minStars}`)
  if (cursor !== undefined) filters.push(`rowid > ${cursor}`)

  const whereClause = filters.join(' AND ')

  // Execute count query
  const countResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM repositories_fts
    WHERE repositories_fts MATCH ${ftsQuery}
      AND ${sql.raw(whereClause)}
  `.execute(db)
  const total = countResult.rows[0]?.count ?? 0

  // Execute search query
  const searchResult = await sql<FtsRow>`
    SELECT rowid, owner, name, description, stars, language, last_commit, archived,
           registry_names, category_names, tag_names,
           bm25(repositories_fts) as rank
    FROM repositories_fts
    WHERE repositories_fts MATCH ${ftsQuery}
      AND ${sql.raw(whereClause)}
    ORDER BY bm25(repositories_fts)
    LIMIT ${limit + 1}
  `.execute(db)

  const hasMore = searchResult.rows.length > limit
  const rows = searchResult.rows.slice(0, limit)

  // Transform results
  const repositories = rows.map(row => ({
    id: row.rowid,
    title: `${row.owner}/${row.name}`,
    description: row.description,
    registries: row.registry_names
      ? row.registry_names.split(',').filter(Boolean)
      : [],
    categories: row.category_names
      ? row.category_names.split(',').filter(Boolean)
      : [],
    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
    qualityScore: calculateQualityScore({
      last_commit: row.last_commit,
      stars: row.stars,
    }),
    repo_info: {
      owner: row.owner,
      repo: row.name,
      stars: row.stars,
      language: row.language,
      last_commit: row.last_commit || '',
      archived: Boolean(row.archived),
    },
  }))

  // Sort by quality score (desc) while preserving FTS rank for similar scores
  repositories.sort((a, b) => {
    const scoreDiff = b.qualityScore - a.qualityScore
    return Math.abs(scoreDiff) > 0.1 ? scoreDiff : 0
  })

  // Generate suggestions if results are sparse
  let suggestions: FtsSearchResult['suggestions']
  if (repositories.length < 5 && !registry && !category) {
    suggestions = await generateSuggestions(db, query)
  }

  return {
    repositories,
    suggestions,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1]?.rowid : undefined,
    total,
  }
}

/**
 * Rebuild the FTS index from repository facets
 */
export async function rebuildFtsIndex(db: Kysely<Database>): Promise<void> {
  await sql`DELETE FROM repositories_fts`.execute(db)

  await sql`
    INSERT INTO repositories_fts(
      rowid, owner, name, description, language,
      registry_names, category_names, tag_names,
      stars, archived, last_commit
    )
    SELECT
      r.id,
      r.owner,
      r.name,
      r.description,
      r.language,
      GROUP_CONCAT(DISTINCT f.registry_name),
      GROUP_CONCAT(DISTINCT f.category_name),
      GROUP_CONCAT(DISTINCT f.tag_name),
      r.stars,
      r.archived,
      r.last_commit
    FROM repositories r
    LEFT JOIN repository_facets f ON r.id = f.repository_id
    GROUP BY r.id
  `.execute(db)
}

/**
 * Generate filter suggestions based on query tokens
 */
async function generateSuggestions(
  db: Kysely<Database>,
  query: string,
): Promise<{ categories: string[]; registries: string[] }> {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)

  if (tokens.length === 0) {
    return { registries: [], categories: [] }
  }

  // Find matching registries
  const registryMatches = await db
    .selectFrom('registry_metadata')
    .select(['registry_name'])
    .where(eb => eb.or(tokens.map(t => eb('registry_name', 'like', `%${t}%`))))
    .limit(3)
    .execute()

  // Find matching categories
  const categoryMatches = await db
    .selectFrom('repository_facets')
    .select([
      sql<string>`category_name`.as('category_name'),
      sql<number>`COUNT(DISTINCT repository_id)`.as('count'),
    ])
    .where(eb => eb.or(tokens.map(t => eb('category_name', 'like', `%${t}%`))))
    .where('category_name', 'is not', null)
    .groupBy('category_name')
    .orderBy(sql`count`, 'desc')
    .limit(3)
    .execute()

  return {
    registries: registryMatches.map(r => r.registry_name),
    categories: categoryMatches.map(c => c.category_name).filter(Boolean),
  }
}

/**
 * Sanitize a query string for FTS5
 * Removes special characters and joins terms with OR for broader matching
 */
function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.toLowerCase())
    .join(' OR ')
}
