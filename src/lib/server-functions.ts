import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import type { RegistryFile, RegistryItem } from '@/types/registry'

import {
  createKysely,
  getLanguages,
  getRegistryData,
  getRegistryMetadata,
  getRegistryStats,
  searchRegistryItems,
} from './db'

// ============================================================================
// Registry API
// ============================================================================

export async function fetchRegistryHandler(
  db: ReturnType<typeof createKysely>,
): Promise<RegistryFile[]> {
  console.info('Fetching registry data...')
  try {
    // Get all registry metadata
    const metadataList = await getRegistryMetadata(db)

    // Fetch full data for each registry
    const registries: RegistryFile[] = await Promise.all(
      metadataList.map(async metadata => {
        const data = await getRegistryData(db, metadata.registry_name)
        return {
          data,
          name: metadata.registry_name,
        }
      }),
    )

    return registries
  } catch (error) {
    console.error('Registry API error:', error)
    throw error
  }
}

export const fetchRegistry = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchRegistryHandler(db)
  },
)

export const registryQueryOptions = () =>
  queryOptions<RegistryFile[]>({
    queryFn: () => fetchRegistry(),
    queryKey: ['registry'],
    staleTime: 60 * 60 * 1000, // 1 hour
  })

// ============================================================================
// Languages API
// ============================================================================

export interface FetchLanguagesInput {
  registry?: string
}

export async function fetchLanguagesHandler(
  db: ReturnType<typeof createKysely>,
  data: FetchLanguagesInput,
): Promise<string[]> {
  console.info('Fetching languages...', data)
  try {
    const languages = await getLanguages(db, data.registry)
    return languages
  } catch (error) {
    console.error('Languages API error:', error)
    throw error
  }
}

export function validateFetchLanguagesInput(
  input: FetchLanguagesInput,
): FetchLanguagesInput {
  return input
}

export const fetchLanguages = createServerFn({ method: 'GET' })
  .inputValidator(validateFetchLanguagesInput)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return fetchLanguagesHandler(db, data)
  })

export const languagesQueryOptions = (registryName?: string) =>
  queryOptions<string[]>({
    queryFn: () => fetchLanguages({ data: { registry: registryName } }),
    queryKey: ['languages', registryName],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

// ============================================================================
// Metadata API
// ============================================================================

export interface RegistryMetadataWithStats {
  description: string
  name: string
  source_repository: string
  stats: {
    languages: string[]
    latestUpdate: string
    totalRepos: number
    totalStars: number
  }
  title: string
}

export async function fetchMetadataHandler(
  db: ReturnType<typeof createKysely>,
): Promise<RegistryMetadataWithStats[]> {
  console.info('Fetching registry metadata...')
  try {
    // Get all registry metadata
    const metadataList = await getRegistryMetadata(db)

    // Get stats for each registry
    const registriesWithStats: RegistryMetadataWithStats[] = await Promise.all(
      metadataList.map(async metadata => {
        const stats = await getRegistryStats(db, metadata.registry_name)
        return {
          description: metadata.description,
          name: metadata.registry_name,
          source_repository: metadata.source_repository,
          stats,
          title: metadata.title,
        }
      }),
    )

    return registriesWithStats
  } catch (error) {
    console.error('Metadata API error:', error)
    throw error
  }
}

export const fetchMetadata = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchMetadataHandler(db)
  },
)

export const metadataQueryOptions = () =>
  queryOptions<RegistryMetadataWithStats[]>({
    queryFn: () => fetchMetadata(),
    queryKey: ['registry-metadata'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

// ============================================================================
// Search API
// ============================================================================

export interface SearchParams {
  archived?: boolean
  category?: string
  cursor?: number
  language?: string
  limit?: number
  minStars?: number
  q?: string
  registryName?: string
  sortBy?: 'name' | 'stars' | 'updated'
}

export interface SearchResult {
  data: (RegistryItem & { category: string; id: number; registry: string })[]
  hasMore: boolean
  nextCursor?: number
  total: number
}

export async function searchRegistryItemsHandler(
  db: ReturnType<typeof createKysely>,
  data: SearchParams,
): Promise<SearchResult> {
  try {
    // Execute search with defaults
    const results = await searchRegistryItems(db, {
      archived: data.archived,
      category: data.category,
      cursor: data.cursor,
      language: data.language,
      limit: data.limit ?? 20,
      minStars: data.minStars,
      q: data.q,
      registryName: data.registryName,
      sortBy: data.sortBy ?? 'stars',
    })

    return results
  } catch (error) {
    console.error('Search API error:', error)
    throw error
  }
}

export function validateSearchParams(input: SearchParams): SearchParams {
  return input
}

export const searchRegistryItemsFn = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchParams)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return searchRegistryItemsHandler(db, data)
  })

export const searchQueryOptions = (params: SearchParams) =>
  queryOptions<SearchResult>({
    queryFn: () => searchRegistryItemsFn({ data: params }),
    queryKey: ['search', params],
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

export const searchInfiniteQueryOptions = (
  baseParams: Omit<SearchParams, 'cursor'>,
) =>
  infiniteQueryOptions({
    queryKey: ['search', baseParams] as const,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      searchRegistryItemsFn({ data: { ...baseParams, cursor: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: previousData => previousData, // Keep previous data while loading
  })

// ============================================================================
// Categories API
// ============================================================================

export interface Category {
  category: string
  count: number
  key: string
  registry: string
}

export interface FetchCategoriesInput {
  registry?: string
}

export async function fetchCategoriesHandler(
  db: ReturnType<typeof createKysely>,
  data: FetchCategoriesInput,
): Promise<Category[]> {
  console.info('Fetching categories...', data)
  try {
    // Get categories with counts
    let query = db
      .selectFrom('registry_items')
      .select([
        'registry_name',
        'category',
        db.fn.count<number>('id').as('count'),
      ])
      .groupBy(['registry_name', 'category'])
      .orderBy('category', 'asc')

    if (data.registry) {
      query = query.where('registry_name', '=', data.registry)
    }

    const results = await query.execute()

    // Transform to a more usable format
    const categories: Category[] = results.map(row => ({
      category: row.category,
      count: row.count,
      key: `${row.registry_name}::${row.category}`,
      registry: row.registry_name,
    }))

    return categories
  } catch (error) {
    console.error('Categories API error:', error)
    throw error
  }
}

export function validateFetchCategoriesInput(
  input: FetchCategoriesInput,
): FetchCategoriesInput {
  return input
}

export const fetchCategories = createServerFn({ method: 'GET' })
  .inputValidator(validateFetchCategoriesInput)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return fetchCategoriesHandler(db, data)
  })

export const categoriesQueryOptions = (registryName?: string) =>
  queryOptions<Category[]>({
    queryFn: () => fetchCategories({ data: { registry: registryName } }),
    queryKey: ['categories', registryName],
    staleTime: 60 * 60 * 1000, // 1 hour
  })
