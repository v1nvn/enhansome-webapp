/**
 * Search repository
 * Handles search queries with filters
 */

import type { Database } from '@/types/database'
import type { RegistryItem } from '@/types/registry'

import { calculateQualityScore } from '../../utils/scoring'

import type { Kysely } from 'kysely'

export interface SearchRepositoryParams {
  archived?: boolean
  cursor?: number
  language?: string
  limit?: number
  minStars?: number
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
}

export interface SearchRepositoryRow {
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

export interface SearchResult {
  data: (RegistryItem & {
    categories: string[]
    id: number
    qualityScore?: number
    registries: string[]
  })[]
  hasMore: boolean
  nextCursor?: number
  total: number
}

export async function getUseCaseCategoryCounts(db: Kysely<Database>): Promise<
  {
    categoryId: string
    count: number
  }[]
> {
  const items = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select([
      'categories.name as category_name',
      'registry_repositories.title',
      'repositories.description',
      'repositories.language',
    ])
    .where('repositories.archived', '=', 0)
    .execute()

  const { categorizeItem, getAllUseCaseCategories } = await import(
    '@/lib/utils/categories'
  )

  const categories = getAllUseCaseCategories()
  const categoryCounts = new Map<string, number>()

  for (const cat of categories) {
    categoryCounts.set(cat.id, 0)
  }

  for (const item of items) {
    const matchedCategories = categorizeItem(
      item.title,
      item.description,
      item.category_name,
    )
    for (const catId of matchedCategories) {
      categoryCounts.set(catId, (categoryCounts.get(catId) ?? 0) + 1)
    }
  }

  return Array.from(categoryCounts.entries())
    .map(([categoryId, count]) => ({ categoryId, count }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

export async function getUseCaseCategoryItems(
  db: Kysely<Database>,
  categoryId: string,
  options?: {
    framework?: string
    limit?: number
    offset?: number
  },
): Promise<
  {
    categories: string[]
    description: null | string
    id: number
    language: null | string
    registry: string
    repo_info?: {
      archived: boolean
      language: null | string
      last_commit: string
      owner: string
      repo: string
      stars: number
    }
    stars: number
    title: string
  }[]
> {
  const { limit = 50, offset = 0, framework } = options ?? {}

  const { getUseCaseCategoryById, categorizeItem } = await import(
    '@/lib/utils/categories'
  )
  const categoryDef = getUseCaseCategoryById(categoryId)

  if (!categoryDef) {
    return []
  }

  let query = db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select([
      'categories.name as category_name',
      'repositories.id',
      'registry_repositories.registry_name',
      'registry_repositories.title',
      'repositories.description',
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
      'repositories.language',
      'repositories.last_commit',
      'repositories.archived',
    ])
    .where('repositories.archived', '=', 0)

  if (framework && framework !== 'all') {
    const frameworkPatterns: Record<string, string[]> = {
      react: ['typescript', 'javascript'],
      vue: ['vue', 'typescript'],
      svelte: ['svelte'],
      angular: ['angular', 'typescript'],
      solid: ['solid'],
      qwik: ['qwik'],
    }

    const patterns = frameworkPatterns[framework]
    query = query.where('repositories.language', 'in', patterns)
  }

  const items = await query
    .orderBy('repositories.stars', 'desc')
    .limit(limit + offset)
    .execute()

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
      registry_name: string
      stars: number
      title: string
    }
  >()

  for (const row of items) {
    if (!repoMap.has(row.id)) {
      repoMap.set(row.id, {
        archived: row.archived,
        categories: new Set(),
        description: row.description,
        id: row.id,
        language: row.language,
        registry_name: row.registry_name,
        stars: row.stars,
        title: row.title,
        owner: row.owner,
        name: row.name,
        last_commit: row.last_commit,
      })
    }
    const existing = repoMap.get(row.id)
    if (existing) {
      existing.categories.add(row.category_name)
    }
  }

  const repoArray = Array.from(repoMap.values())
  const matchedItems = repoArray
    .filter(repo => {
      for (const categoryName of repo.categories) {
        const matchedCategories = categorizeItem(
          repo.title,
          repo.description,
          categoryName,
        )
        if (matchedCategories.includes(categoryId)) {
          return true
        }
      }
      return false
    })
    .slice(offset, offset + limit)

  return matchedItems.map(repo => ({
    categories: Array.from(repo.categories).sort(),
    description: repo.description,
    id: repo.id,
    language: repo.language,
    registry: repo.registry_name,
    stars: repo.stars,
    title: repo.title,
    repo_info: {
      archived: Boolean(repo.archived),
      language: repo.language,
      last_commit: repo.last_commit || '',
      owner: repo.owner,
      repo: repo.name,
      stars: repo.stars,
    },
  }))
}

export async function searchRepos(
  db: Kysely<Database>,
  params: SearchRepositoryParams,
): Promise<SearchResult> {
  const {
    archived = false,
    cursor,
    language,
    limit = 20,
    minStars,
    q,
    registryName,
    sortBy = 'quality',
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
    .innerJoin(
      'registry_repository_categories as rrc',
      'rrc.repository_id',
      'r.id',
    )
    .innerJoin('categories as c', 'c.id', 'rrc.category_id')
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
      'c.name as category_name',
    ])

  if (registryName) {
    mainQuery = mainQuery.where('rr.registry_name', '=', registryName)
  }
  if (language) {
    mainQuery = mainQuery.where('r.language', '=', language)
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
      title: string
    }
  >()

  for (const row of allResults) {
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

    const item: RegistryItem & {
      categories: string[]
      id: number
      qualityScore?: number
      registries: string[]
    } = {
      categories,
      children: [],
      description: r.description,
      id: r.id,
      registries,
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
