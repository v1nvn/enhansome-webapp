/**
 * Search repository
 * Handles search queries with filters
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'
import type { RegistryItem } from '@/types/registry'

import { calculateQualityScore } from '../../utils/scoring'

import type { Kysely } from 'kysely'

export interface FilterOptions {
  categories: { count: number; name: string }[]
  languages: { count: number; name: string }[]
  registries: { count: number; label: string; name: string }[]
  tags: { count: number; name: string }[]
}

export interface GetFilterOptionsParams {
  categoryName?: string
  language?: string
  registryName?: string
  tagName?: string
}

export interface SearchRepositoryParams {
  archived?: boolean
  categoryName?: string
  cursor?: number
  language?: string
  limit?: number
  minStars?: number
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
  tagName?: string
}

export interface SearchRepositoryRow {
  archived: number
  category_name: null | string
  description: null | string
  id: number
  language: null | string
  last_commit: null | string
  name: string
  owner: string
  registry_name: string
  stars: number
  tag_name: null | string
  title: string
}

export interface SearchResult {
  data: (RegistryItem & {
    categories: string[]
    id: number
    qualityScore?: number
    registries: string[]
    tags: string[]
  })[]
  hasMore: boolean
  nextCursor?: number
  total: number
}

export async function getFilterOptions(
  db: Kysely<Database>,
  params: GetFilterOptionsParams = {},
): Promise<FilterOptions> {
  const { categoryName, language, registryName, tagName } = params

  interface FacetRow {
    count: number
    label: string
    slug: string
    type: string
    value: string
  }

  // Registry counts: cross-filtered by language + category + tag, NOT by registry
  let registryQuery = db
    .selectFrom('repository_facets as f')
    .innerJoin('registry_metadata as rm', 'rm.registry_name', 'f.registry_name')
    .select([
      sql<string>`'registry'`.as('type'),
      'f.registry_name as value',
      'rm.title as label',
      sql<string>`''`.as('slug'),
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .groupBy(['f.registry_name', 'rm.title'])

  if (language) {
    registryQuery = registryQuery.where('f.language', '=', language)
  }
  if (categoryName) {
    registryQuery = registryQuery.where('f.category_name', '=', categoryName)
  }
  if (tagName) {
    registryQuery = registryQuery.where('f.tag_name', '=', tagName)
  }

  // Language counts: cross-filtered by registry + category + tag, NOT by language
  let languageQuery = db
    .selectFrom('repository_facets as f')
    .select([
      sql<string>`'language'`.as('type'),
      'f.language as value',
      'f.language as label',
      sql<string>`''`.as('slug'),
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .where('f.language', 'is not', null)
    .groupBy('f.language')

  if (registryName) {
    languageQuery = languageQuery.where('f.registry_name', '=', registryName)
  }
  if (categoryName) {
    languageQuery = languageQuery.where('f.category_name', '=', categoryName)
  }
  if (tagName) {
    languageQuery = languageQuery.where('f.tag_name', '=', tagName)
  }

  // Category counts: cross-filtered by registry + language + tag, NOT by category
  let categoryQuery = db
    .selectFrom('repository_facets as f')
    .select([
      sql<string>`'category'`.as('type'),
      'f.category_name as value',
      'f.category_name as label',
      sql<string>`''`.as('slug'),
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .groupBy('f.category_name')

  if (registryName) {
    categoryQuery = categoryQuery.where('f.registry_name', '=', registryName)
  }
  if (language) {
    categoryQuery = categoryQuery.where('f.language', '=', language)
  }
  if (tagName) {
    categoryQuery = categoryQuery.where('f.tag_name', '=', tagName)
  }

  // Tag counts: cross-filtered by registry + language + category, NOT by tag
  let tagQuery = db
    .selectFrom('repository_facets as f')
    .select([
      sql<string>`'tag'`.as('type'),
      'f.tag_name as value',
      'f.tag_name as label',
      sql<string>`''`.as('slug'),
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .groupBy('f.tag_name')

  if (registryName) {
    tagQuery = tagQuery.where('f.registry_name', '=', registryName)
  }
  if (language) {
    tagQuery = tagQuery.where('f.language', '=', language)
  }
  if (categoryName) {
    tagQuery = tagQuery.where('f.category_name', '=', categoryName)
  }

  const [registryRows, languageRows, categoryRows, tagRows] = await Promise.all(
    [
      registryQuery.execute(),
      languageQuery.execute(),
      categoryQuery.execute(),
      tagQuery.execute(),
    ],
  )

  const registries = (registryRows as FacetRow[])
    .map(r => ({
      count: r.count,
      label: stripRegistryPrefix(r.label),
      name: r.value,
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  const languages = (languageRows as FacetRow[])
    .map(r => ({
      count: r.count,
      name: r.value,
    }))
    .filter(l => l.count > 0)
    .sort((a, b) => b.count - a.count)

  const categories = (categoryRows as FacetRow[])
    .map(r => ({
      count: r.count,
      name: r.value,
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  const tags = (tagRows as FacetRow[])
    .map(r => ({
      count: r.count,
      name: r.value,
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)

  return { categories, languages, registries, tags }
}

export async function searchRepos(
  db: Kysely<Database>,
  params: SearchRepositoryParams,
): Promise<SearchResult> {
  const {
    archived = false,
    categoryName,
    cursor,
    language,
    limit = 20,
    minStars,
    q,
    registryName,
    sortBy = 'quality',
    tagName,
  } = params

  // Get total count
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
  if (categoryName) {
    countQuery = countQuery.where(eb =>
      eb.exists(
        eb
          .selectFrom('repository_facets as f')
          .select(sql`1`.as('one'))
          .whereRef('f.repository_id', '=', 'r.id')
          .where('f.category_name', '=', categoryName),
      ),
    )
  }
  if (tagName) {
    countQuery = countQuery.where(eb =>
      eb.exists(
        eb
          .selectFrom('repository_facets as f')
          .select(sql`1`.as('one'))
          .whereRef('f.repository_id', '=', 'r.id')
          .where('f.tag_name', '=', tagName),
      ),
    )
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

  const offset = cursor ?? 0

  // Main query
  let mainQuery = db
    .selectFrom('repositories as r')
    .innerJoin('registry_repositories as rr', 'rr.repository_id', 'r.id')
    .leftJoin('repository_facets as f', eb =>
      eb
        .onRef('f.repository_id', '=', 'r.id')
        .onRef('f.registry_name', '=', 'rr.registry_name'),
    )
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
      'rr.registry_name',
      'f.category_name as category_name',
      'f.tag_name as tag_name',
    ])

  if (registryName) {
    mainQuery = mainQuery.where('rr.registry_name', '=', registryName)
  }
  if (language) {
    mainQuery = mainQuery.where('r.language', '=', language)
  }
  if (categoryName) {
    mainQuery = mainQuery.where('f.category_name', '=', categoryName)
  }
  if (tagName) {
    mainQuery = mainQuery.where('f.tag_name', '=', tagName)
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

  const allResults = await mainQuery.limit(1000).execute()

  // Group by repository
  const repoMap = new Map<
    number,
    {
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
      tags: Set<string>
      title: string
    }
  >()

  for (const row of allResults) {
    const existing = repoMap.get(row.id)
    if (existing) {
      existing.registries.add(row.registry_name)
      if (row.category_name) existing.categories.add(row.category_name)
      if (row.tag_name) existing.tags.add(row.tag_name)
    } else {
      repoMap.set(row.id, {
        archived: row.archived,
        categories: row.category_name
          ? new Set([row.category_name])
          : new Set(),
        description: row.description,
        id: row.id,
        language: row.language,
        last_commit: row.last_commit,
        name: row.name,
        owner: row.owner,
        registries: new Set([row.registry_name]),
        stars: row.stars,
        tags: row.tag_name ? new Set([row.tag_name]) : new Set(),
        title: row.title,
      })
    }
  }

  const aggregatedRows = Array.from(repoMap.values())

  // Sort
  let sortField: 'last_commit' | 'name' | 'stars' = 'stars'
  let sortDirection: 'asc' | 'desc' = 'desc'

  switch (sortBy) {
    case 'name':
      sortField = 'name'
      sortDirection = 'asc'
      break
    case 'stars':
      sortField = 'stars'
      sortDirection = 'desc'
      break
    case 'updated':
      sortField = 'last_commit'
      sortDirection = 'desc'
      break
    case 'quality':
    default:
      sortField = 'stars'
      sortDirection = 'desc'
      break
  }

  aggregatedRows.sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'desc'
        ? bVal.localeCompare(aVal)
        : aVal.localeCompare(bVal)
    }
    return 0
  })

  const paginatedRows = aggregatedRows.slice(offset, offset + limit + 1)
  const rows = paginatedRows.slice(0, limit)

  const hasMore = paginatedRows.length > limit

  const data = rows.map(r => {
    const categories = Array.from(r.categories).sort()
    const registries = Array.from(r.registries).sort()
    const tags = Array.from(r.tags).sort()

    const item: RegistryItem & {
      categories: string[]
      id: number
      qualityScore?: number
      registries: string[]
      tags: string[]
    } = {
      categories,
      children: [],
      description: r.description,
      id: r.id,
      registries,
      tags,
      title: r.title,
      qualityScore: calculateQualityScore({
        last_commit: r.last_commit,
        stars: r.stars,
      }),
      repo_info: {
        archived: Boolean(r.archived),
        language: r.language,
        last_commit: r.last_commit || '',
        owner: r.owner,
        repo: r.name,
        stars: r.stars,
      },
    }
    return item
  })

  if (sortBy === 'quality') {
    data.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
  }

  return {
    data,
    hasMore,
    nextCursor: hasMore ? offset + limit : undefined,
    total,
  }
}

function stripRegistryPrefix(title: string): string {
  return title
    .replace(/^(awesome|enhansome)\s*/i, '')
    .replace(/\s+with stars$/i, '')
    .trim()
}
