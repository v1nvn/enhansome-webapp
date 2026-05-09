/**
 * Server functions
 * API endpoints using the refactored architecture
 */

import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import { createKysely } from '../db/client'
import {
  fetchEmergingReposHandler,
  fetchFilterOptionsHandler,
  fetchMetadataHandler,
  fetchRegistryDetailHandler,
  fetchRepoDetailHandler,
  fetchTrendingRegistriesHandler,
  fetchTrendingTagsHandler,
  searchReposHandler,
} from './handlers'

// Re-export types that components need
export type { TrendingRegistry } from './handlers/registry-handlers'
export type { RepoDetail } from './handlers/repository-handlers'

// ============================================================================
// Metadata API
// ============================================================================

const fetchMetadata = createServerFn({ method: 'GET' }).handler(async () => {
  const db = createKysely(env.DB)
  return fetchMetadataHandler(db)
})

export const metadataQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchMetadata(),
    queryKey: ['registry-metadata'],
    staleTime: 24 * 60 * 60 * 1000,
  })

// ============================================================================
// Trending Registries API
// ============================================================================

const fetchTrendingRegistries = createServerFn({
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
// Trending Tags API
// ============================================================================

const fetchTrendingTags = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchTrendingTagsHandler(db)
  },
)

export const trendingTagsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchTrendingTags(),
    queryKey: ['trending-tags'],
    staleTime: 30 * 60 * 1000,
  })

// ============================================================================
// Registry Detail API
// ============================================================================

interface FetchRegistryDetailInput {
  name: string
}

export function validateFetchRegistryDetailInput(
  input: FetchRegistryDetailInput,
): FetchRegistryDetailInput {
  return input
}

const fetchRegistryDetail = createServerFn({ method: 'GET' })
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

interface FetchRepoDetailInput {
  name: string
  owner: string
}

export function validateFetchRepoDetailInput(
  input: FetchRepoDetailInput,
): FetchRepoDetailInput {
  return input
}

const fetchRepoDetail = createServerFn({ method: 'GET' })
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

interface SearchParams {
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

export function validateSearchParams(input: SearchParams): SearchParams {
  return input
}

const searchReposFn = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchParams)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return searchReposHandler(db, data)
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
      baseParams.limit,
      baseParams.categoryName,
      baseParams.tagName,
    ] as const,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      searchReposFn({ data: { ...baseParams, cursor: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
    placeholderData: previousData => previousData,
  })

// ============================================================================
// Filter Options API (unified facets query)
// ============================================================================

interface FetchFilterOptionsInput {
  categoryName?: string
  language?: string
  registryName?: string
  tagName?: string
}

export function validateFetchFilterOptionsInput(
  input: FetchFilterOptionsInput,
): FetchFilterOptionsInput {
  return input
}

const fetchFilterOptions = createServerFn({ method: 'GET' })
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
    placeholderData: previousData => previousData,
  })

// ============================================================================
// Emerging Repos API
// ============================================================================

const fetchEmergingRepos = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchEmergingReposHandler(db)
  },
)

export const emergingReposQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchEmergingRepos(),
    queryKey: ['emerging-repos'],
    staleTime: 30 * 60 * 1000,
  })
