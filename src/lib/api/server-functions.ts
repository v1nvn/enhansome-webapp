/**
 * Server functions
 * API endpoints using the refactored architecture
 */

import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import { createKysely } from '../db/client'
import {
  fetchFilterOptionsHandler,
  fetchMetadataHandler,
  fetchRegistryDetailHandler,
  fetchRepoDetailHandler,
  fetchTrendingRegistriesHandler,
  fetchUseCaseCategoriesHandler,
  getIndexingHistoryHandler,
  getIndexingStatusHandler,
  searchReposHandler,
  stopIndexingHandler,
} from './handlers'
import { adminAuthMiddleware } from './middleware'

// Re-export types that components need
export type {
  RegistryDetail,
  RegistryMetadataWithStats,
  TrendingRegistry,
} from './handlers/registry-handlers'
export type { RepoDetail } from './handlers/repository-handlers'

export type {
  FilterOptions,
  UseCaseCategoryWithData,
} from './handlers/search-handlers'

// ============================================================================
// Metadata API
// ============================================================================

export const fetchMetadata = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchMetadataHandler(db)
  },
)

export const metadataQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchMetadata(),
    queryKey: ['registry-metadata'],
    staleTime: 24 * 60 * 60 * 1000,
  })

// ============================================================================
// Trending Registries API
// ============================================================================

export const fetchTrendingRegistries = createServerFn({
  method: 'GET',
}).handler(async () => {
  const db = createKysely(env.DB)
  return fetchTrendingRegistriesHandler(db)
})

export const trendingQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchTrendingRegistries(),
    queryKey: ['trending-registries'],
    staleTime: 30 * 60 * 1000,
  })

// ============================================================================
// Registry Detail API
// ============================================================================

export interface FetchRegistryDetailInput {
  name: string
}

export function validateFetchRegistryDetailInput(
  input: FetchRegistryDetailInput,
): FetchRegistryDetailInput {
  return input
}

export const fetchRegistryDetail = createServerFn({ method: 'GET' })
  .inputValidator(validateFetchRegistryDetailInput)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return fetchRegistryDetailHandler(db, data)
  })

export const registryDetailQueryOptions = (name: string) =>
  queryOptions({
    queryFn: () => fetchRegistryDetail({ data: { name } }),
    queryKey: ['registry-detail', name],
    staleTime: 60 * 60 * 1000,
  })

// ============================================================================
// Repo Detail API
// ============================================================================

export interface FetchRepoDetailInput {
  name: string
  owner: string
}

export function validateFetchRepoDetailInput(
  input: FetchRepoDetailInput,
): FetchRepoDetailInput {
  return input
}

export const fetchRepoDetail = createServerFn({ method: 'GET' })
  .inputValidator(validateFetchRepoDetailInput)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return fetchRepoDetailHandler(db, data)
  })

export const repoDetailQueryOptions = (owner: string, name: string) =>
  queryOptions({
    queryFn: () => fetchRepoDetail({ data: { name, owner } }),
    queryKey: ['repo-detail', owner, name],
    staleTime: 60 * 60 * 1000,
  })

// ============================================================================
// Search API
// ============================================================================

import { type FilterPreset } from '../utils/filters'

export interface SearchParams {
  archived?: boolean
  categoryName?: string
  cursor?: number
  dateFrom?: string
  language?: string
  limit?: number
  minStars?: number
  preset?: FilterPreset
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
}

export function validateSearchParams(input: SearchParams): SearchParams {
  return input
}

export const searchReposFn = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchParams)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return searchReposHandler(db, data)
  })

export const searchQueryOptions = (params: SearchParams) =>
  queryOptions({
    queryFn: () => searchReposFn({ data: params }),
    queryKey: ['search', params],
    staleTime: 5 * 60 * 1000,
  })

export const searchInfiniteQueryOptions = (
  baseParams: Omit<SearchParams, 'cursor'>,
) =>
  infiniteQueryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      'search',
      baseParams.q,
      baseParams.language,
      baseParams.registryName,
      baseParams.sortBy,
      baseParams.minStars,
      baseParams.archived,
      baseParams.dateFrom,
      baseParams.preset,
      baseParams.limit,
      baseParams.categoryName,
    ] as const,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      searchReposFn({ data: { ...baseParams, cursor: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
    placeholderData: previousData => previousData,
  })

// ============================================================================
// Use Case Categories API
// ============================================================================

export const fetchUseCaseCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchUseCaseCategoriesHandler(db)
  },
)

// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix
export const useCaseCategoriesQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchUseCaseCategories(),
    queryKey: ['use-case-categories'],
    staleTime: 60 * 60 * 1000,
  })

// ============================================================================
// Filter Options API (unified facets query)
// ============================================================================

export interface FetchFilterOptionsInput {
  categoryName?: string
  language?: string
  registryName?: string
}

export function validateFetchFilterOptionsInput(
  input: FetchFilterOptionsInput,
): FetchFilterOptionsInput {
  return input
}

export const fetchFilterOptions = createServerFn({ method: 'GET' })
  .inputValidator(validateFetchFilterOptionsInput)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return fetchFilterOptionsHandler(db, data)
  })

export const filterOptionsQueryOptions = (params?: FetchFilterOptionsInput) =>
  queryOptions({
    queryFn: () => fetchFilterOptions({ data: params ?? {} }),
    queryKey: ['filter-options', { params }],
    staleTime: 24 * 60 * 60 * 1000,
  })

// ============================================================================
// Admin API
// ============================================================================

export const validateAdminApiKey = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(() => {
    return { success: true }
  })

export const getIndexingStatus = createServerFn({ method: 'GET' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return getIndexingStatusHandler(db)
  })

export const indexingStatusQueryOptions = () =>
  queryOptions({
    queryFn: () => getIndexingStatus(),
    queryKey: ['indexing-status'],
    refetchInterval: query => {
      return query.state.data?.isRunning ? 2000 : 10000
    },
  })

export const getIndexingHistory = createServerFn({ method: 'GET' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return getIndexingHistoryHandler(db)
  })

export const indexingHistoryQueryOptions = () =>
  queryOptions({
    queryFn: () => getIndexingHistory(),
    queryKey: ['indexing-history'],
    staleTime: 30 * 1000,
  })

export const stopIndexing = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return stopIndexingHandler(db)
  })

export const triggerIndexRegistries = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const apiKey = getRequestHeader('X-Admin-API-Key')
    const createdBy = apiKey ? apiKey.slice(-4) : undefined

    const jobId = crypto.randomUUID()

    const message = {
      jobId,
      triggerSource: 'manual' as const,
      createdBy,
      timestamp: new Date().toISOString(),
    }

    try {
      await env.INDEXING_QUEUE.send(message)

      return {
        status: 'queued',
        message: 'Indexing job queued successfully',
        jobId,
        timestamp: message.timestamp,
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error('Failed to queue indexing job')
    }
  })
