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
 * Uses registry_repositories_fts for registry-scoped queries (no LIKE, no split)
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

  if (registry) {
    return ftsSearchRegistry(db, {
      query,
      registry,
      category,
      tag,
      language,
      minStars,
      limit,
      cursor,
      archived,
      sortBy,
      hasQuery,
      sanitizedQuery,
    })
  }

  return ftsSearchGlobal(db, {
    query,
    category,
    tag,
    language,
    minStars,
    limit,
    cursor,
    archived,
    sortBy,
    hasQuery,
    sanitizedQuery,
  })
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
 * Rebuild the registry-specific FTS index (Kysely version for tests)
 * Creates one row per (repository, registry, category) for efficient filtering
 */
export async function rebuildRegistryFtsIndex(
  db: Kysely<Database>,
): Promise<void> {
  await sql`DELETE FROM registry_repositories_fts`.execute(db)

  await sql`
    INSERT INTO registry_repositories_fts(
      rowid, owner, name, description, language,
      registry_name, category_name, tag_names, title,
      repository_id, stars, archived, last_commit
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY f.registry_name, f.category_name, r.stars DESC) + 1000000,
      r.owner,
      r.name,
      r.description,
      r.language,
      f.registry_name,
      COALESCE(f.category_name, 'Uncategorized'),
      (
        SELECT GROUP_CONCAT(t.name)
        FROM repo_tags rt
        JOIN tags t ON t.id = rt.tag_id
        WHERE rt.repository_id = r.id AND rt.registry_name = f.registry_name
      ),
      rr.title,
      r.id,
      r.stars,
      r.archived,
      r.last_commit
    FROM repositories r
    INNER JOIN repository_facets f ON r.id = f.repository_id
    INNER JOIN registry_repositories rr ON r.id = rr.repository_id
      AND rr.registry_name = f.registry_name
    WHERE f.category_name IS NOT NULL
  `.execute(db)
}

/**
 * Build ORDER BY clause for different sort options
 */
function buildOrderByClause(
  sortBy: 'name' | 'quality' | 'stars' | 'updated',
  hasQuery: boolean,
  tableName = 'repositories_fts',
): string {
  switch (sortBy) {
    case 'name':
      return 'ORDER BY owner || "/" || name ASC'
    case 'stars':
      return 'ORDER BY stars DESC'
    case 'updated':
      return 'ORDER BY last_commit DESC, repository_id DESC'
    case 'quality':
    default:
      // For quality sort with FTS, use BM25 rank, then sort by quality in memory
      return hasQuery ? `ORDER BY bm25(${tableName})` : 'ORDER BY stars DESC'
  }
}

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

// ============================================================
// FTS Search Function
// ============================================================

/**
 * Global search using repositories_fts (unchanged)
 */
async function ftsSearchGlobal(
  db: Kysely<Database>,
  params: {
    archived: boolean
    category?: string
    cursor?: number
    hasQuery: boolean
    language?: string
    limit: number
    minStars?: number
    query: string
    sanitizedQuery: string
    sortBy: 'name' | 'quality' | 'stars' | 'updated'
    tag?: string
  },
): Promise<FtsSearchResult> {
  const {
    category,
    tag,
    language,
    minStars,
    limit,
    cursor,
    archived,
    sortBy,
    hasQuery,
    sanitizedQuery,
  } = params

  // Build additional filter conditions
  const filters: string[] = []
  if (!archived) filters.push('archived = 0')
  else filters.push('archived = 1')
  if (category) filters.push(exactMatchFilter('category_names', category))
  if (tag) filters.push(exactMatchFilter('tag_names', tag))
  if (language) filters.push(`language = '${escapeSql(language)}'`)
  if (minStars !== undefined) filters.push(`stars >= ${minStars}`)

  // Build WHERE clause - include MATCH only if there's a query
  const whereClause =
    filters.length > 0
      ? hasQuery
        ? `repositories_fts MATCH '${escapeSql(sanitizedQuery)}' AND ${filters.join(' AND ')}`
        : filters.join(' AND ')
      : hasQuery
        ? `repositories_fts MATCH '${escapeSql(sanitizedQuery)}'`
        : '1=1'

  const orderByClause = buildOrderByClause(sortBy, hasQuery)

  // Execute count query
  const countResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM repositories_fts
    WHERE ${sql.raw(whereClause)}
  `.execute(db)
  const total = countResult.rows[0]?.count ?? 0

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
  if (hasQuery && repositories.length < 5) {
    suggestions = await generateSuggestions(db, params.query)
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
 * Registry-scoped search using registry_repositories_fts
 * One row per (repo, registry, category) - no comma-sep, no LIKE, no split
 */
async function ftsSearchRegistry(
  db: Kysely<Database>,
  params: {
    archived: boolean
    category?: string
    cursor?: number
    hasQuery: boolean
    language?: string
    limit: number
    minStars?: number
    query: string
    registry: string
    sanitizedQuery: string
    sortBy: 'name' | 'quality' | 'stars' | 'updated'
    tag?: string
  },
): Promise<FtsSearchResult> {
  const {
    registry,
    category,
    tag,
    language,
    minStars,
    limit,
    cursor,
    archived,
    sortBy,
    hasQuery,
    sanitizedQuery,
  } = params

  // Build filters - use exact match for category_name (no LIKE needed)
  const filters: string[] = []
  if (!archived) filters.push('archived = 0')
  else filters.push('archived = 1')
  if (category) filters.push(`category_name = '${escapeSql(category)}'`)
  // tag filter still uses LIKE since tag_names is comma-separated for display only
  if (tag) {
    filters.push(
      `(
        tag_names = '${escapeSql(tag)}'
        OR tag_names LIKE '${escapeSql(tag)},%'
        OR tag_names LIKE '%,${escapeSql(tag)}'
        OR tag_names LIKE '%,${escapeSql(tag)},%'
      )`,
    )
  }
  if (language) filters.push(`language = '${escapeSql(language)}'`)
  if (minStars !== undefined) filters.push(`stars >= ${minStars}`)

  // Build WHERE clause
  const whereClause =
    filters.length > 0
      ? hasQuery
        ? `registry_repositories_fts MATCH '${escapeSql(sanitizedQuery)}' AND registry_name = '${escapeSql(registry)}' AND ${filters.join(' AND ')}`
        : `registry_name = '${escapeSql(registry)}' AND ${filters.join(' AND ')}`
      : hasQuery
        ? `registry_repositories_fts MATCH '${escapeSql(sanitizedQuery)}' AND registry_name = '${escapeSql(registry)}'`
        : `registry_name = '${escapeSql(registry)}'`

  const orderByClause = buildOrderByClause(
    sortBy,
    hasQuery,
    'registry_repositories_fts',
  )

  // Execute count query
  const countResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM registry_repositories_fts
    WHERE ${sql.raw(whereClause)}
  `.execute(db)
  const total = countResult.rows[0]?.count ?? 0

  const offset = cursor ?? 0

  // Execute search query
  const searchResult = await sql<{
    archived: number
    category_name: string
    description: null | string
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    rank: number
    registry_name: string
    repository_id: number
    stars: number
    tag_names: string
    title: string
  }>`
    SELECT owner, name, description, stars, language, last_commit, archived,
           registry_name, category_name, tag_names, title, repository_id,
           ${sql.raw(hasQuery ? 'bm25(registry_repositories_fts) as rank' : '0 as rank')}
    FROM registry_repositories_fts
    WHERE ${sql.raw(whereClause)}
    ${sql.raw(orderByClause)}
    LIMIT ${limit + 1} OFFSET ${offset}
  `.execute(db)

  const hasMore = searchResult.rows.length > limit
  const rows = searchResult.rows.slice(0, limit)

  // Group by repository_id to dedupe (one row per category, so same repo appears multiple times)
  const repoMap = new Map<
    number,
    {
      categories: Set<string>
      description: null | string
      id: number
      language: null | string
      last_commit: null | string
      name: string
      owner: string
      qualityScore: number
      repo_info: {
        archived: boolean
        language: null | string
        last_commit: string
        owner: string
        repo: string
        stars: number
      }
      stars: number
      tags: Set<string>
      title: string
    }
  >()

  for (const row of rows) {
    if (!repoMap.has(row.repository_id)) {
      repoMap.set(row.repository_id, {
        id: row.repository_id,
        title: row.title,
        description: row.description,
        categories: new Set(),
        tags: new Set(),
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
        stars: row.stars,
        language: row.language,
        last_commit: row.last_commit,
        name: row.name,
        owner: row.owner,
      })
    }
    const repo = repoMap.get(row.repository_id)
    if (!repo) {
      throw new Error('unreachable')
    }

    repo.categories.add(row.category_name)
    if (row.tag_names) {
      for (const t of row.tag_names.split(',')) {
        if (t) repo.tags.add(t)
      }
    }
  }

  const repositories = Array.from(repoMap.values()).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    registries: [registry],
    categories: Array.from(r.categories).sort(),
    tags: Array.from(r.tags).sort(),
    qualityScore: r.qualityScore,
    repo_info: r.repo_info,
  }))

  // For quality sort, apply additional sorting
  if (sortBy === 'quality' && hasQuery) {
    repositories.sort((a, b) => {
      const scoreDiff = b.qualityScore - a.qualityScore
      return Math.abs(scoreDiff) > 0.1 ? scoreDiff : 0
    })
  }

  return {
    repositories,
    hasMore,
    nextCursor: hasMore ? offset + limit : undefined,
    total,
  }
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
