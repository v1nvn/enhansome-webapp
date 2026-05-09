/**
 * Search repository
 * Handles search queries with filters
 */

import { sql } from 'kysely'

import type { Database } from '@/types/database'
import type { RegistryItem } from '@/types/registry'

import { calculateQualityScore } from '../../utils/scoring'
import { ftsSearch } from './fts-search-repository'

import type { Kysely } from 'kysely'

export interface FilterOptions {
  categories: { count: number; name: string }[]
  languages: { count: number; name: string }[]
  registries: { count: number; label: string; name: string }[]
  tags: { count: number; name: string }[]
}

interface GetFilterOptionsParams {
  categoryName?: string
  language?: string
  registryName?: string
  tagName?: string
}

interface SearchRepositoryParams {
  archived?: boolean
  categoryName?: string
  cursor?: number
  dateFrom?: string
  language?: string
  limit?: number
  minStars?: number
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
  tagName?: string
}

interface SearchResult {
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

export async function getEmergingRepos(
  db: Kysely<Database>,
  limit = 8,
): Promise<
  (RegistryItem & {
    categories: string[]
    id: number
    qualityScore: number
    registries: string[]
    tags: string[]
  })[]
> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  interface EmergingRow {
    archived: number
    category_names: string
    description: null | string
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    registry_names: string
    rowid: number
    stars: number
    tag_names: string
    titles: string
  }

  const result = await sql<EmergingRow>`
    SELECT rowid, owner, name, description, stars, language, last_commit, archived,
           registry_names, category_names, tag_names, titles
    FROM repositories_fts
    WHERE archived = 0
      AND stars >= 50
      AND stars < 5000
      AND last_commit >= ${thirtyDaysAgo}
    ORDER BY last_commit DESC, stars DESC
    LIMIT ${limit * 3}
  `.execute(db)

  const repos = result.rows.map(row => {
    const titleList = row.titles ? row.titles.split(',').filter(Boolean) : []
    return {
      id: row.rowid,
      title: titleList[0] || `${row.owner}/${row.name}`,
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
      children: [],
    }
  })

  repos.sort((a, b) => b.qualityScore - a.qualityScore)

  return repos.slice(0, limit)
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
    dateFrom,
    language,
    limit = 20,
    minStars,
    q,
    registryName,
    sortBy = 'quality',
    tagName,
  } = params

  // Use FTS search for all queries (including empty query for filter-only searches)
  const ftsResult = await ftsSearch(db, {
    query: q || '', // Empty string for filter-only searches
    registry: registryName,
    category: categoryName,
    tag: tagName,
    language,
    minStars,
    dateFrom,
    limit,
    cursor,
    archived,
    sortBy,
  })

  // Transform FTS result to match SearchResult format
  const data = ftsResult.repositories.map(r => ({
    ...r.repo_info,
    children: [],
    description: r.description,
    id: r.id,
    registries: r.registries,
    tags: r.tags,
    categories: r.categories,
    title: r.title,
    qualityScore: r.qualityScore,
    repo_info: r.repo_info,
  }))

  return {
    data,
    hasMore: ftsResult.hasMore,
    nextCursor: ftsResult.nextCursor,
    total: ftsResult.total,
  }
}

function stripRegistryPrefix(title: string): string {
  return title
    .replace(/^(awesome|enhansome)\s*/i, '')
    .replace(/\s+with stars$/i, '')
    .trim()
}
