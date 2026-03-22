/**
 * FTS5 Search Repository
 * Full-text search with natural language queries and filter suggestions
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'

import { calculateQualityScore } from '../../utils/scoring'

import type { Kysely } from 'kysely'

export interface FtsSearchParams {
  /** Include archived repositories (default: false) */
  archived?: boolean
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
  /** Natural language search query (empty for filter-only searches) */
  query: string
  /** Filter to specific registry */
  registry?: string
  /** Sort order: quality (default), stars, updated, name */
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
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
  titles: string
}

// ============================================================
// Helper Functions
// ============================================================

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
    archived = false,
    sortBy = 'quality',
  } = params

  // Handle empty query for filter-only searches
  const hasQuery = query.trim().length > 0
  const sanitizedQuery = sanitizeFtsQuery(query)

  // Build additional filter conditions
  const filters: string[] = []
  if (!archived) filters.push('archived = 0')
  else filters.push('archived = 1')
  if (registry) filters.push(exactMatchFilter('registry_names', registry))
  if (category) filters.push(exactMatchFilter('category_names', category))
  if (tag) filters.push(exactMatchFilter('tag_names', tag))
  if (language) filters.push(`language = '${escapeSql(language)}'`)
  if (minStars !== undefined) filters.push(`stars >= ${minStars}`)
  // Note: cursor is used for OFFSET pagination, not rowid filtering
  // We apply it after getting results, not in the WHERE clause

  // Build WHERE clause - include MATCH only if there's a query
  // Default to '1=1' if no filters and no query (match everything)
  const whereClause =
    filters.length > 0
      ? hasQuery
        ? `repositories_fts MATCH '${escapeSql(sanitizedQuery)}' AND ${filters.join(' AND ')}`
        : filters.join(' AND ')
      : hasQuery
        ? `repositories_fts MATCH '${escapeSql(sanitizedQuery)}'`
        : '1=1'

  // Build ORDER BY clause based on sortBy
  const orderByClause = buildOrderByClause(sortBy, hasQuery)

  // Execute count query
  const countResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM repositories_fts
    WHERE ${sql.raw(whereClause)}
  `.execute(db)
  const total = countResult.rows[0]?.count ?? 0

  // Use cursor as OFFSET for pagination (compatibility with original implementation)
  const offset = cursor ?? 0

  // Execute search query with OFFSET
  const searchResult = await sql<FtsRow>`
    SELECT rowid, owner, name, description, stars, language, last_commit, archived,
           registry_names, category_names, tag_names, titles,
           ${sql.raw(hasQuery ? 'bm25(repositories_fts) as rank' : '0 as rank')}
    FROM repositories_fts
    WHERE ${sql.raw(whereClause)}
    ${sql.raw(orderByClause)}
    LIMIT ${limit + 1} OFFSET ${offset}
  `.execute(db)

  const hasMore = searchResult.rows.length > limit
  const rows = searchResult.rows.slice(0, limit)

  // Transform results
  const repositories = rows.map(row => {
    // Extract title from titles column, fallback to owner/name
    const titleList = row.titles ? row.titles.split(',').filter(Boolean) : []
    const title = titleList[0] || `${row.owner}/${row.name}`

    return {
      id: row.rowid,
      title,
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
    }
  })

  // For quality sort, apply additional sorting while preserving FTS rank
  if (sortBy === 'quality' && hasQuery) {
    repositories.sort((a, b) => {
      const scoreDiff = b.qualityScore - a.qualityScore
      return Math.abs(scoreDiff) > 0.1 ? scoreDiff : 0
    })
  }

  // Generate suggestions if results are sparse (only for actual searches)
  let suggestions: FtsSearchResult['suggestions']
  if (hasQuery && repositories.length < 5 && !registry && !category) {
    suggestions = await generateSuggestions(db, query)
  }

  return {
    repositories,
    suggestions,
    hasMore,
    nextCursor: hasMore ? offset + limit : undefined,
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
      registry_names, category_names, tag_names, titles,
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
      GROUP_CONCAT(DISTINCT rr.title),
      r.stars,
      r.archived,
      r.last_commit
    FROM repositories r
    LEFT JOIN repository_facets f ON r.id = f.repository_id
    LEFT JOIN registry_repositories rr ON r.id = rr.repository_id
    GROUP BY r.id
  `.execute(db)
}

/**
 * Build ORDER BY clause for different sort options
 */
function buildOrderByClause(
  sortBy: 'name' | 'quality' | 'stars' | 'updated',
  hasQuery: boolean,
): string {
  switch (sortBy) {
    case 'name':
      return 'ORDER BY owner || "/" || name ASC'
    case 'stars':
      return 'ORDER BY stars DESC'
    case 'updated':
      return 'ORDER BY last_commit DESC, rowid DESC'
    case 'quality':
    default:
      // For quality sort with FTS, use BM25 rank, then sort by quality in memory
      return hasQuery
        ? 'ORDER BY bm25(repositories_fts)'
        : 'ORDER BY stars DESC'
  }
}

// ============================================================
// FTS Search Function
// ============================================================

/**
 * Escape a string value for SQL (basic escaping)
 */
function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Build an exact match filter for comma-separated values
 * Handles edge cases: single value, first value, last value, middle value
 */
function exactMatchFilter(column: string, value: string): string {
  const escaped = escapeSql(value)
  return `(
    ${column} = '${escaped}'
    OR ${column} LIKE '${escaped},%'
    OR ${column} LIKE '%,${escaped}'
    OR ${column} LIKE '%,${escaped},%'
  )`
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
