import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import type { RegistryItem } from '@/types/registry'

import {
  createKysely,
  getLanguages,
  getRegistryDetail,
  getRegistryMetadata,
  getRegistryStats,
  getRepoDetail,
  getTrendingRegistries,
  getUseCaseCategoryCounts,
  searchRepos,
} from './db'
import { adminAuthMiddleware } from './middleware'

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
    categories?: string[]
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

    // Single query for ALL registry_repositories to avoid N+1
    const categoryRows = await db
      .selectFrom('registry_repositories')
      .select(['registry_name', 'categories'])
      .execute()

    // Aggregate categories by registry_name in memory
    const categoryMap = new Map<string, Set<string>>()
    for (const row of categoryRows) {
      let categories: string[] = []
      try {
        categories = JSON.parse(row.categories) as string[]
      } catch {
        // Skip invalid JSON
      }

      if (!categoryMap.has(row.registry_name)) {
        categoryMap.set(row.registry_name, new Set<string>())
      }
      const registryCategories = categoryMap.get(row.registry_name)
      if (registryCategories) {
        categories.forEach(c => registryCategories.add(c))
      }
    }

    // Convert Sets to sorted arrays
    const sortedCategoryMap = new Map<string, string[]>()
    for (const [registryName, categories] of categoryMap.entries()) {
      sortedCategoryMap.set(registryName, Array.from(categories).sort())
    }

    // Get stats for each registry
    const registriesWithStats: RegistryMetadataWithStats[] = await Promise.all(
      metadataList.map(async metadata => {
        const stats = await getRegistryStats(db, metadata.registry_name)
        return {
          description: metadata.description,
          name: metadata.registry_name,
          source_repository: metadata.source_repository,
          stats: {
            ...stats,
            categories: sortedCategoryMap.get(metadata.registry_name) ?? [],
          },
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
// Trending Registries API
// ============================================================================

export interface TrendingRegistry {
  description: string
  name: string
  starsGrowth: number
  title: string
  total_items: number
  total_stars: number
}

export async function fetchTrendingRegistriesHandler(
  db: ReturnType<typeof createKysely>,
  limit = 12,
): Promise<TrendingRegistry[]> {
  console.info('Fetching trending registries...')
  try {
    const trending = await getTrendingRegistries(db, limit)
    return trending
  } catch (error) {
    console.error('Trending registries API error:', error)
    throw error
  }
}

export const fetchTrendingRegistries = createServerFn({
  method: 'GET',
}).handler(async () => {
  const db = createKysely(env.DB)
  return fetchTrendingRegistriesHandler(db)
})

export const trendingQueryOptions = () =>
  queryOptions<TrendingRegistry[]>({
    queryFn: () => fetchTrendingRegistries(),
    queryKey: ['trending-registries'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

// ============================================================================
// Registry Detail API
// ============================================================================

export interface FetchRegistryDetailInput {
  name: string
}

export interface RegistryDetail {
  categories: string[]
  description: string
  languages: string[]
  last_updated: string
  source_repository: string
  title: string
  topRepos: {
    categories: string[]
    description: null | string
    language: null | string
    name: string
    owner: null | string
    stars: number
  }[]
  total_items: number
  total_stars: number
}

export async function fetchRegistryDetailHandler(
  db: ReturnType<typeof createKysely>,
  data: FetchRegistryDetailInput,
): Promise<null | RegistryDetail> {
  console.info('Fetching registry detail...', data)
  try {
    const detail = await getRegistryDetail(db, data.name)
    return detail
  } catch (error) {
    console.error('Registry detail API error:', error)
    throw error
  }
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
  queryOptions<null | RegistryDetail>({
    queryFn: () => fetchRegistryDetail({ data: { name } }),
    queryKey: ['registry-detail', name],
    staleTime: 60 * 60 * 1000, // 1 hour
  })

// ============================================================================
// Repo Detail API
// ============================================================================

export interface FetchRepoDetailInput {
  name: string
  owner: string
}

export interface RepoDetail {
  categories: string[]
  description: null | string
  language: null | string
  lastCommit: null | string
  name: string
  owner: string
  registries: {
    name: string
  }[]
  registryName: string
  relatedRepos: {
    categories: string[]
    name: string
    owner: null | string
    stars: number
  }[]
  stars: number
}

export async function fetchRepoDetailHandler(
  db: ReturnType<typeof createKysely>,
  data: FetchRepoDetailInput,
): Promise<null | RepoDetail> {
  console.info('Fetching repo detail...', data)
  try {
    const detail = await getRepoDetail(db, data.owner, data.name)
    return detail
  } catch (error) {
    console.error('Repo detail API error:', error)
    throw error
  }
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
  queryOptions<null | RepoDetail>({
    queryFn: () => fetchRepoDetail({ data: { name, owner } }),
    queryKey: ['repo-detail', owner, name],
    staleTime: 60 * 60 * 1000, // 1 hour
  })

import { type FilterPreset, presetToSearchParams } from './filter-presets'

// ============================================================================
// Search API
// ============================================================================

export interface SearchParams {
  archived?: boolean
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

export async function searchReposHandler(
  db: ReturnType<typeof createKysely>,
  data: SearchParams,
): Promise<SearchResult> {
  try {
    // Convert preset to actual search params
    const presetParams = presetToSearchParams(data.preset)

    // Execute search with defaults and preset params merged
    const results = await searchRepos(db, {
      archived: data.archived ?? presetParams.archived,
      cursor: data.cursor,
      language: data.language,
      limit: data.limit ?? 20,
      minStars: data.minStars ?? presetParams.minStars,
      q: data.q,
      registryName: data.registryName,
      sortBy: data.sortBy ?? 'quality',
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

export const searchReposFn = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchParams)
  .handler(async ({ data }) => {
    const db = createKysely(env.DB)
    return searchReposHandler(db, data)
  })

export const searchQueryOptions = (params: SearchParams) =>
  queryOptions<SearchResult>({
    queryFn: () => searchReposFn({ data: params }),
    queryKey: ['search', params],
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    ] as const,
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      searchReposFn({ data: { ...baseParams, cursor: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: previousData => previousData, // Keep previous data while loading
  })

// ============================================================================
// Admin API
// ============================================================================

/**
 * Validate admin API key
 * Returns success if API key is valid, throws error otherwise
 */
export const validateAdminApiKey = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(() => {
    // If we reach here, middleware validated the API key successfully
    return { success: true }
  })

export interface IndexingHistoryEntry {
  completedAt?: string
  createdBy?: string
  currentRegistry?: string
  errorMessage?: string
  errors?: string[]
  failedCount?: number
  id: number
  processedRegistries?: number
  startedAt: string
  status: 'completed' | 'failed' | 'running'
  successCount?: number
  totalRegistries?: number
  triggerSource: 'manual' | 'scheduled'
}

export interface IndexingStatus {
  current: IndexingHistoryEntry | null
  isRunning: boolean
}

export interface IndexRegistriesResult {
  errors: string[]
  failed: number
  success: number
  timestamp: string
}

/**
 * Transform database row to IndexingHistoryEntry
 */
interface HistoryRow {
  completed_at: null | string
  created_by: null | string
  current_registry: null | string
  error_message: null | string
  errors: null | string
  failed_count: number
  id: number
  processed_registries: number
  started_at: string
  status: 'completed' | 'failed' | 'running'
  success_count: number
  total_registries: null | number
  trigger_source: 'manual' | 'scheduled'
}

/**
 * Get current indexing status (latest run)
 */
export async function getIndexingStatusHandler(
  db: ReturnType<typeof createKysely>,
): Promise<IndexingStatus> {
  const result = await db
    .selectFrom('indexing_latest')
    .innerJoin(
      'indexing_history',
      'indexing_history.id',
      'indexing_latest.history_id',
    )
    .select([
      'indexing_history.id',
      'indexing_history.trigger_source',
      'indexing_history.status',
      'indexing_history.started_at',
      'indexing_history.completed_at',
      'indexing_history.total_registries',
      'indexing_history.processed_registries',
      'indexing_history.current_registry',
      'indexing_history.success_count',
      'indexing_history.failed_count',
      'indexing_history.errors',
      'indexing_history.error_message',
      'indexing_history.created_by',
      'indexing_latest.status as latest_status',
    ])
    .execute()

  if (result.length === 0) {
    return { current: null, isRunning: false }
  }

  const row = result[0]
  return {
    current: historyRowToEntry(row),
    isRunning: row.latest_status === 'running',
  }
}

function historyRowToEntry(row: HistoryRow): IndexingHistoryEntry {
  return {
    id: row.id,
    triggerSource: row.trigger_source,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    totalRegistries: row.total_registries ?? undefined,
    processedRegistries: row.processed_registries,
    currentRegistry: row.current_registry ?? undefined,
    successCount: row.success_count,
    failedCount: row.failed_count,
    errors: row.errors ? (JSON.parse(row.errors) as string[]) : undefined,
    errorMessage: row.error_message ?? undefined,
    createdBy: row.created_by ?? undefined,
  }
}

export const getIndexingStatus = createServerFn({ method: 'GET' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return getIndexingStatusHandler(db)
  })

export const indexingStatusQueryOptions = () =>
  queryOptions<IndexingStatus>({
    queryFn: () => getIndexingStatus(),
    queryKey: ['indexing-status'],
    refetchInterval: query => {
      // Poll every 2 seconds if running, every 10 seconds otherwise
      return query.state.data?.isRunning ? 2000 : 10000
    },
  })

/**
 * Get indexing history (past runs)
 */
export interface IndexingHistoryParams {
  limit?: number
  offset?: number
}

export async function getIndexingHistoryHandler(
  db: ReturnType<typeof createKysely>,
): Promise<IndexingHistoryEntry[]> {
  const history = await db
    .selectFrom('indexing_history')
    .selectAll()
    .orderBy('started_at', 'desc')
    .limit(50)
    .execute()

  return history.map(historyRowToEntry)
}

export const getIndexingHistory = createServerFn({ method: 'GET' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return getIndexingHistoryHandler(db)
  })

export const indexingHistoryQueryOptions = () =>
  queryOptions<IndexingHistoryEntry[]>({
    queryFn: () => getIndexingHistory(),
    queryKey: ['indexing-history'],
    staleTime: 30 * 1000, // 30 seconds
  })

/**
 * Stop/cancel the current indexing operation
 * @returns Status message indicating success or if nothing was running
 */
export async function stopIndexingHandler(
  db: ReturnType<typeof createKysely>,
): Promise<{
  message: string
  status: 'not_running' | 'stopped'
  timestamp: string
}> {
  // Get the current running job
  const result = await db
    .selectFrom('indexing_latest')
    .innerJoin(
      'indexing_history',
      'indexing_history.id',
      'indexing_latest.history_id',
    )
    .select(['indexing_history.id', 'indexing_history.status'])
    .execute()

  if (result.length === 0 || result[0].status !== 'running') {
    return {
      status: 'not_running',
      message: 'No indexing job is currently running',
      timestamp: new Date().toISOString(),
    }
  }

  const historyId = result[0].id
  const completedAt = new Date().toISOString()

  // Mark the current job as failed/cancelled
  await db
    .updateTable('indexing_history')
    .set({
      completed_at: completedAt,
      current_registry: null,
      error_message: 'Indexing was manually stopped',
      status: 'failed',
    })
    .where('id', '=', historyId)
    .execute()

  // Update latest status
  await db
    .updateTable('indexing_latest')
    .set({
      status: 'failed',
      updated_at: completedAt,
    })
    .where('id', '=', 1)
    .execute()

  return {
    status: 'stopped',
    message: 'Indexing stopped successfully',
    timestamp: completedAt,
  }
}

/**
 * Trigger registry indexing on-demand via Queue
 * Requires X-Admin-API-Key header with valid API key from env.ADMIN_API_KEYS
 * Sends message to queue and returns immediately
 */
export const triggerIndexRegistries = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    // Extract API key identifier for tracking
    // Note: API key is already validated by middleware
    const apiKey = getRequestHeader('X-Admin-API-Key')
    const createdBy = apiKey ? apiKey.slice(-4) : undefined

    // Generate unique job ID
    const jobId = crypto.randomUUID()

    // Create queue message
    const message = {
      jobId,
      triggerSource: 'manual' as const,
      createdBy,
      timestamp: new Date().toISOString(),
    }

    try {
      // Send message to queue
      await env.INDEXING_QUEUE.send(message)

      console.log(
        `✅ Indexing job ${jobId} queued by ${createdBy || 'unknown'}`,
      )

      return {
        status: 'queued',
        message: 'Indexing job queued successfully',
        jobId,
        timestamp: message.timestamp,
      }
    } catch (error) {
      console.error('❌ Failed to queue indexing job:', error)
      throw new Error('Failed to queue indexing job')
    }
  })

/**
 * Stop/cancel the current indexing operation
 * Requires X-Admin-API-Key header with valid API key from env.ADMIN_API_KEYS
 */
export const stopIndexing = createServerFn({ method: 'POST' })
  .middleware([adminAuthMiddleware])
  .handler(async () => {
    const db = createKysely(env.DB)
    return stopIndexingHandler(db)
  })

// ============================================================================
// Use Case Categories API
// ============================================================================

export interface UseCaseCategoryCount {
  categoryId: string
  count: number
}

export interface UseCaseCategoryWithData {
  count: number
  description: string
  icon: string
  id: string
  title: string
}

export async function fetchUseCaseCategoriesHandler(
  db: ReturnType<typeof createKysely>,
): Promise<UseCaseCategoryWithData[]> {
  console.info('Fetching use case categories...')
  try {
    const counts = await getUseCaseCategoryCounts(db)
    const { getAllCategories } = await import('./use-case-categories')
    const allCategories = getAllCategories()

    // Merge category definitions with counts
    const countMap = new Map(counts.map(c => [c.categoryId, c.count]))

    return allCategories
      .map(cat => ({
        ...cat,
        count: countMap.get(cat.id) || 0,
      }))
      .filter(cat => cat.count > 0) // Only return categories with items
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('Use case categories API error:', error)
    throw error
  }
}

export const fetchUseCaseCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = createKysely(env.DB)
    return fetchUseCaseCategoriesHandler(db)
  },
)

// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix
export const useCaseCategoriesQueryOptions = () =>
  queryOptions<UseCaseCategoryWithData[]>({
    queryFn: () => fetchUseCaseCategories(),
    queryKey: ['use-case-categories'],
    staleTime: 60 * 60 * 1000, // 1 hour
  })
