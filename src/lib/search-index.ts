/**
 * FlexSearch integration for fast full-text search
 *
 * This module provides an in-memory search index using FlexSearch,
 * with optional KV caching for performance. The index is built from
 * registry items and provides faster search than LIKE queries.
 *
 * Cache strategy:
 * - Index is stored in KV with 24-hour TTL
 * - Rebuilt on registry updates or cache miss
 * - Fallback to database queries if index unavailable
 */

import { Index } from 'flexsearch'

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

// ============================================================================
// Types
// ============================================================================

export interface SearchDocument {
  archived: boolean
  category: string
  description: string
  id: number
  language: null | string
  registryName: string
  stars: number
  title: string
}

export interface SearchIndexData {
  builtAt: string
  documents: SearchDocument[]
  version: number
}

export interface SearchResultItem {
  document: SearchDocument
  id: number
  score: number
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds
const INDEX_VERSION = 1
const KV_INDEX_KEY = 'search:index'

// ============================================================================
// Index Builder
// ============================================================================

export interface FlexSearchOptions {
  archived?: boolean
  category?: string
  language?: string
  limit?: number
  minStars?: number
  registryName?: string
}

/**
 * Build a search index from all registry items in the database
 */
export async function buildSearchIndex(
  db: Kysely<Database>,
): Promise<SearchIndexData> {
  const items = await db
    .selectFrom('registry_items')
    .select([
      'id',
      'registry_name as registryName',
      'title',
      'description',
      'category',
      'language',
      'stars',
      'archived',
    ])
    .execute()

  const documents: SearchDocument[] = items.map(item => ({
    id: item.id,
    registryName: item.registryName,
    title: item.title,
    description: item.description ?? '',
    category: item.category,
    language: item.language,
    stars: item.stars,
    archived: Boolean(item.archived),
  }))

  return {
    builtAt: new Date().toISOString(),
    documents,
    version: INDEX_VERSION,
  }
}

/**
 * Execute search using FlexSearch
 */
export function flexSearch(
  indexData: SearchIndexData,
  query: string,
  options: FlexSearchOptions = {},
): SearchResultItem[] {
  const {
    limit = 20,
    registryName,
    category,
    language,
    minStars,
    archived = false,
  } = options

  // Create index
  const { docMap, search } = createFlexSearchIndex(indexData.documents)

  // Execute search - using FlexSearch's Index API directly
  const results = query.trim() ? search(query, limit * 2) || [] : []

  // Get matched document IDs
  const matchedIds = Array.isArray(results) ? results : []

  // Fetch documents and apply filters
  const items: SearchResultItem[] = []

  for (const id of matchedIds.slice(0, limit * 3)) {
    const doc = docMap.get(Number(id))
    if (!doc) continue

    // Apply filters
    if (registryName && doc.registryName !== registryName) continue
    if (category && doc.category !== category) continue
    if (language && doc.language !== language) continue
    if (minStars && doc.stars < minStars) continue
    if (!archived && doc.archived) continue

    items.push({
      id: doc.id,
      score: 1, // FlexSearch doesn't return scores by default
      document: doc,
    })

    if (items.length >= limit) break
  }

  // If no results from index, return empty
  if (items.length === 0 && query.trim()) {
    return []
  }

  // If no query, return filtered documents sorted by stars
  if (!query.trim()) {
    let filtered = indexData.documents

    if (registryName) {
      filtered = filtered.filter(d => d.registryName === registryName)
    }
    if (category) {
      filtered = filtered.filter(d => d.category === category)
    }
    if (language) {
      filtered = filtered.filter(d => d.language === language)
    }
    if (minStars) {
      filtered = filtered.filter(d => d.stars >= minStars)
    }
    if (!archived) {
      filtered = filtered.filter(d => !d.archived)
    }

    return filtered
      .sort((a, b) => b.stars - a.stars)
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        score: 1,
        document: doc,
      }))
  }

  return items
}

/**
 * Get or build search index with KV caching
 */
export async function getOrCreateSearchIndex(
  db: Kysely<Database>,
  kv?: KVNamespace,
): Promise<SearchIndexData> {
  // Try to load from KV first
  if (kv) {
    const cached = await loadIndexFromKV(kv)
    if (cached) {
      return cached
    }
  }

  // Build new index
  const indexData = await buildSearchIndex(db)

  // Save to KV if available
  if (kv) {
    try {
      await saveIndexToKV(kv, indexData)
    } catch {
      console.error('Failed to cache search index, continuing without cache')
    }
  }

  return indexData
}

/**
 * Invalidate the cached search index
 * Call this after registry updates
 */
export async function invalidateSearchIndex(kv?: KVNamespace): Promise<void> {
  if (kv) {
    try {
      await kv.delete(KV_INDEX_KEY)
    } catch {
      console.error('Failed to invalidate search index')
    }
  }
}

/**
 * Load search index from KV cache
 */
export async function loadIndexFromKV(
  kv: KVNamespace,
): Promise<null | SearchIndexData> {
  try {
    const data = await kv.get(KV_INDEX_KEY, 'text')
    if (!data) return null

    const indexData = JSON.parse(data) as SearchIndexData

    // Validate version
    if (indexData.version !== INDEX_VERSION) {
      console.warn('Index version mismatch, ignoring cached index')
      return null
    }

    return indexData
  } catch {
    console.error('Failed to load search index from KV')
    return null
  }
}

// ============================================================================
// Search Execution
// ============================================================================

/**
 * Save search index to KV cache
 */
export async function saveIndexToKV(
  kv: KVNamespace,
  indexData: SearchIndexData,
): Promise<void> {
  try {
    const data = JSON.stringify(indexData)
    await kv.put(KV_INDEX_KEY, data, {
      expirationTtl: CACHE_TTL,
    })
  } catch {
    console.error('Failed to save search index to KV')
    throw new Error('Failed to save search index to KV')
  }
}

/**
 * Server-side search with automatic index management
 * Falls back to database query if FlexSearch fails
 */
export async function serverSearch(
  db: Kysely<Database>,
  query: string,
  options: FlexSearchOptions = {},
  kv?: KVNamespace,
): Promise<{ items: SearchResultItem[]; usedFallback: boolean }> {
  try {
    // Get or build index
    const indexData = await getOrCreateSearchIndex(db, kv)

    // Execute search
    const items = flexSearch(indexData, query, options)

    return { items, usedFallback: false }
  } catch {
    console.error('FlexSearch failed, falling back to database query')
    return { items: [], usedFallback: true }
  }
}

/**
 * Create a FlexSearch index from documents
 */
function createFlexSearchIndex(documents: SearchDocument[]): {
  docMap: Map<number, SearchDocument>
  search: (query: string, limit?: number) => unknown
} {
  const index = new Index({
    context: true,
    resolution: 9,
    tokenize: 'full',
  })

  const docMap = new Map<number, SearchDocument>()

  // Index each document
  for (const doc of documents) {
    // Create searchable text from title, description, category
    const searchableText = [
      doc.title,
      doc.description,
      doc.category,
      doc.language || '',
    ]
      .filter(Boolean)
      .join(' ')

    index.add(doc.id, searchableText)
    docMap.set(doc.id, doc)
  }

  return {
    docMap,
    search: (query: string, limit?: number) => index.search(query, { limit }),
  }
}

// ============================================================================
// Server Integration Helper
// ============================================================================
