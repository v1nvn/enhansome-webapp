/**
 * Registry data indexer for Cloudflare D1
 * Fetches JSON files from enhansome-registry repo and indexes them into D1
 */

import JSZip from 'jszip'

import type { RegistryData, RegistryItem } from '@/types/registry'

import { normalizeCategoryName, seedCategories } from './utils/categories'
import { normalizeTagName } from './utils/tags'

const REGISTRY_ARCHIVE_URL =
  'https://github.com/v1nvn/enhansome-registry/archive/refs/heads/main.zip'

// D1 batch API limit
const D1_MAX_BATCH_STATEMENTS = 100

interface FlattenedItem {
  category: string
  data: RegistryItem
}

interface SyncLogEntry {
  errorMessage?: string
  itemsSynced?: number
  registryName: string
  status: 'error' | 'success'
}

/**
 * Normalize registry name from owner/repo or identifier
 * Examples:
 *   "v1nvn/enhansome-go" -> "go"
 *   "enhansome-mcp-servers" -> "mcp-servers"
 */
export function extractRegistryName(identifier: string): string {
  // Handle "owner/repo" format
  const parts = identifier.split('/')
  const repo = parts.length > 1 ? parts[1] : identifier
  // Remove 'enhansome-' prefix
  return repo.replace(/^enhansome-/, '')
}

/**
 * Fetch all registry JSON files from enhansome-registry repo
 * Downloads the zip archive and extracts all data.json files
 */
export async function fetchRegistryFiles(
  archiveUrl?: string,
): Promise<Map<string, RegistryData>> {
  const url = archiveUrl ?? REGISTRY_ARCHIVE_URL
  const files = new Map<string, RegistryData>()
  console.log('Fetching registry data from GitHub archive...')

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch archive: ${response.status}`)
    }

    const zipData = await response.arrayBuffer()
    const zip = await JSZip.loadAsync(zipData)

    // Detect archive prefix by finding repos/ directory
    const repoPrefix = findRepoPrefix(zip.files)
    const reposPrefix = `${repoPrefix}repos/`

    let successCount = 0
    let skippedCount = 0

    for (const [path, file] of Object.entries(zip.files)) {
      if (!path.startsWith(reposPrefix) || file.dir) continue

      if (path.endsWith('/data.json')) {
        try {
          const content = await file.async('text')
          const jsonData: unknown = JSON.parse(content)

          if (!isValidRegistryData(jsonData)) {
            console.warn(`  Skipped ${path}: Invalid data structure`)
            skippedCount++
            continue
          }

          const registryName = extractRegistryNameFromPath(path, repoPrefix)
          if (registryName) {
            files.set(registryName, jsonData)
            successCount++
            console.log(`  Loaded ${registryName}`)
          }
        } catch (error) {
          console.error(`  Error reading ${path}:`, error)
          skippedCount++
        }
      }
    }

    console.log(
      `  Loaded ${successCount} registries from archive${
        skippedCount > 0 ? ` (${skippedCount} skipped)` : ''
      }`,
    )
    return files
  } catch (error) {
    console.error('Error fetching registry files:', error)
    throw error
  }
}

/**
 * Flatten registry data structure into indexable items with total stars
 */
export function flattenItems(data: RegistryData): {
  items: FlattenedItem[]
  totalStars: number
} {
  const items: FlattenedItem[] = []
  let totalStars = 0

  for (const section of data.items) {
    for (const item of section.items) {
      items.push({
        category: section.title,
        data: item,
      })
      totalStars += item.repo_info?.stars || 0
    }
  }

  return { items, totalStars }
}

/**
 * Index all registries with progress tracking and history
 */
export async function indexAllRegistries(
  db: D1Database,
  triggerSource: 'manual' | 'scheduled' = 'scheduled',
  createdBy?: string,
  archiveUrl?: string,
): Promise<{
  errors: string[]
  failed: number
  success: number
}> {
  console.log(
    `Starting D1 indexing process... (source: ${triggerSource}${
      createdBy ? ` by ${createdBy}` : ''
    })`,
  )

  if (await isIndexingRunning(db)) {
    console.log('Indexing already in progress, skipping...')
    return { success: 0, failed: 0, errors: ['Indexing already in progress'] }
  }

  // Seed categories from frozen set before indexing
  await seedCategories(db)

  const historyId = await createHistoryEntry(db, triggerSource, createdBy)
  await updateLatestStatus(db, 'running', historyId)

  try {
    const files = await fetchRegistryFiles(archiveUrl)
    console.log(`Found ${files.size} registry files to index`)

    await db
      .prepare('UPDATE indexing_history SET total_registries = ? WHERE id = ?')
      .bind(files.size, historyId)
      .run()

    const result = await processRegistries(db, files, historyId)

    await rebuildFacets(db)

    await completeHistoryEntry(
      db,
      historyId,
      'completed',
      result.success,
      result.failed,
      result.errors,
    )
    await updateLatestStatus(db, 'completed')

    console.log(
      `\nIndexing complete: ${result.success} succeeded, ${result.failed} failed`,
    )
    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await completeHistoryEntry(db, historyId, 'failed', 0, 0, [], errorMsg)
    await updateLatestStatus(db, 'failed')

    console.error('Indexing failed:', error)
    throw error
  }
}

/**
 * Index a single registry into D1 using bulk operations
 */
export async function indexRegistry(
  db: D1Database,
  registryName: string,
  data: RegistryData,
): Promise<number> {
  console.log(`Indexing registry: ${registryName}`)

  const collected = createCollectedData()
  const { itemCount } = collectRegistryData(registryName, data, collected)

  console.log(
    `  Found ${itemCount} items, ${collected.repos.size} unique repos`,
  )

  const noopReporter: ProgressReporter = () => Promise.resolve()
  await bulkWriteCollectedData(db, collected, noopReporter)

  console.log(`  Successfully indexed ${registryName}`)
  return itemCount
}

/**
 * Rebuild the repository_facets denormalized table.
 * Called once after all registries are indexed. Clears and repopulates
 * from repositories + repo_tags + tags + categories.
 */
export async function rebuildFacets(db: D1Database): Promise<void> {
  console.log('Rebuilding repository_facets table...')
  const deleteStmt = db.prepare('DELETE FROM repository_facets')
  const insertStmt = db.prepare(
    `INSERT INTO repository_facets (repository_id, registry_name, language, category_name, tag_name)
     SELECT r.id, rt.registry_name, r.language, c.name, t.name
     FROM repositories r
     JOIN repo_tags rt ON rt.repository_id = r.id
     JOIN tags t ON t.id = rt.tag_id
     LEFT JOIN categories c ON c.id = rt.category_id
     WHERE r.archived = 0`,
  )
  await db.batch([deleteStmt, insertStmt])
  console.log('repository_facets rebuilt successfully')
}

/**
 * Complete an indexing history entry with success or failure status
 */
async function completeHistoryEntry(
  db: D1Database,
  historyId: number,
  status: 'completed' | 'failed',
  success: number,
  failed: number,
  errors: string[],
  errorMessage?: string,
): Promise<void> {
  const completedAt = new Date().toISOString()

  if (status === 'completed') {
    await db
      .prepare(
        `UPDATE indexing_history
         SET status = 'completed',
             completed_at = ?,
             success_count = ?,
             failed_count = ?,
             errors = ?,
             current_step = NULL
         WHERE id = ?`,
      )
      .bind(completedAt, success, failed, JSON.stringify(errors), historyId)
      .run()
  } else {
    await db
      .prepare(
        `UPDATE indexing_history
         SET status = 'failed',
             completed_at = ?,
             error_message = ?,
             current_step = NULL
         WHERE id = ?`,
      )
      .bind(completedAt, errorMessage, historyId)
      .run()
  }
}

/**
 * Create a new indexing history entry and return its ID
 */
async function createHistoryEntry(
  db: D1Database,
  triggerSource: 'manual' | 'scheduled',
  createdBy?: string,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO indexing_history (trigger_source, status, started_at, created_by) VALUES (?, ?, ?, ?)`,
    )
    .bind(triggerSource, 'running', new Date().toISOString(), createdBy || null)
    .run()
  return result.meta.last_row_id
}

/**
 * Extract registry name from archive file path
 * Path format: <prefix>/repos/owner/repo/data.json
 */
function extractRegistryNameFromPath(
  path: string,
  repoPrefix: string,
): null | string {
  const relativePath = path.slice(`${repoPrefix}repos/`.length)
  const parts = relativePath.split('/')
  if (parts.length >= 2) {
    return extractRegistryName(`${parts[0]}/${parts[1]}`)
  }
  return null
}

/**
 * Find the archive prefix by locating the repos/ directory
 */
function findRepoPrefix(files: Record<string, JSZip.JSZipObject>): string {
  for (const path of Object.keys(files)) {
    const reposIndex = path.indexOf('/repos/')
    if (reposIndex !== -1) {
      return path.slice(0, reposIndex + 1)
    }
  }
  throw new Error('Could not find repos/ directory in archive')
}

/**
 * Flush sync log entries and finalize indexing status
 */
async function flushSyncLog(
  db: D1Database,
  historyId: number,
  entries: SyncLogEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const statements: D1PreparedStatement[] = []

  for (const entry of entries) {
    if (entry.status === 'error') {
      statements.push(
        db
          .prepare(
            'INSERT INTO sync_log (registry_name, status, error_message) VALUES (?, ?, ?)',
          )
          .bind(entry.registryName, 'error', entry.errorMessage),
      )
    } else {
      statements.push(
        db
          .prepare(
            'INSERT INTO sync_log (registry_name, status, items_synced) VALUES (?, ?, ?)',
          )
          .bind(entry.registryName, 'success', entry.itemsSynced),
      )
    }
  }

  // Update progress to 100% complete
  statements.push(
    db
      .prepare(
        'UPDATE indexing_history SET progress = 100, current_step = NULL WHERE id = ?',
      )
      .bind(historyId),
  )
  statements.push(
    db
      .prepare('UPDATE indexing_latest SET updated_at = ? WHERE id = 1')
      .bind(new Date().toISOString()),
  )

  await executeBatched(db, statements)
}

/**
 * Check if indexing is currently running
 */
async function isIndexingRunning(db: D1Database): Promise<boolean> {
  const latestResult = await db
    .prepare(
      'SELECT status FROM indexing_latest ORDER BY updated_at DESC LIMIT 1',
    )
    .first<{ status: string }>()
  return latestResult?.status === 'running'
}

/**
 * Validate that JSON data has required RegistryData structure
 */
function isValidRegistryData(data: unknown): data is RegistryData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'metadata' in data
  )
}

/**
 * Process all registries with bulk collection and single write
 */
async function processRegistries(
  db: D1Database,
  files: Map<string, RegistryData>,
  historyId: number,
): Promise<{ errors: string[]; failed: number; success: number }> {
  const errors: string[] = []
  let failed = 0
  let success = 0

  // Phase 1: Collect all data in memory (pure CPU — no progress updates needed)
  const collected = createCollectedData()
  const syncLogBuffer: SyncLogEntry[] = []

  for (const [registryName, data] of files.entries()) {
    try {
      const { itemCount } = collectRegistryData(registryName, data, collected)
      syncLogBuffer.push({
        registryName,
        status: 'success',
        itemsSynced: itemCount,
      })
      success++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`${registryName}: ${errorMsg}`)
      console.error(`Error collecting ${registryName}:`, error)
      syncLogBuffer.push({
        registryName,
        status: 'error',
        errorMessage: errorMsg,
      })
      failed++
    }
  }

  console.log(
    `Collected: ${collected.repos.size} repos, ${collected.tags.size} tags, ` +
      `${collected.repoTags.length} repo-tag links, ${collected.repoCategories.length} category links`,
  )

  // Build cumulative weight map for O(1) lookup (order matches execution order)
  // Each value is the cumulative % progress (0-100) after that step completes.
  const cumulativeWeights = new Map<BulkWriteStep, number>()
  let cumulative = 0
  for (const key of BULK_WRITE_STEP_ORDER) {
    cumulative += BULK_WRITE_STEPS[key].weight
    cumulativeWeights.set(key, cumulative)
  }

  const report: ProgressReporter = async (step: BulkWriteStep) => {
    const progress = cumulativeWeights.get(step) ?? 0
    const message = BULK_WRITE_STEPS[step].message
    console.log(`Progress: ${progress}% - ${message}`)
    await db
      .prepare(
        'UPDATE indexing_history SET progress = ?, current_step = ? WHERE id = ?',
      )
      .bind(progress, message, historyId)
      .run()
  }

  // Phase 2: Bulk write all collected data
  let bulkWriteError: Error | undefined
  try {
    await bulkWriteCollectedData(db, collected, report)
  } catch (error) {
    bulkWriteError = error as Error
  }

  // Phase 3: Flush sync log even if bulk write failed so collected progress is preserved
  try {
    await flushSyncLog(db, historyId, syncLogBuffer)
  } catch (flushError) {
    if (!bulkWriteError) {
      throw flushError
    }
    console.error(
      'Failed to flush sync log after bulk write failure:',
      flushError,
    )
  }

  if (bulkWriteError) {
    throw bulkWriteError
  }

  return { success, failed, errors }
}

/**
 * Update the indexing_latest table status
 */
async function updateLatestStatus(
  db: D1Database,
  status: 'completed' | 'failed' | 'running',
  historyId?: number,
): Promise<void> {
  if (historyId !== undefined) {
    await db
      .prepare(
        'UPDATE indexing_latest SET history_id = ?, status = ?, updated_at = ? WHERE id = 1',
      )
      .bind(historyId, status, new Date().toISOString())
      .run()
  } else {
    await db
      .prepare(
        'UPDATE indexing_latest SET status = ?, updated_at = ? WHERE id = 1',
      )
      .bind(status, new Date().toISOString())
      .run()
  }
}

// ============================================================
// Bulk SQL helpers
// ============================================================

const D1_MAX_BIND_PARAMS = 100

const BULK_WRITE_STEPS = {
  clearOldData: { weight: 15, message: 'clearing old data' },
  linkRepositories: { weight: 10, message: 'linking repositories' },
  resolveRepoIds: { weight: 5, message: 'resolving repository IDs' },
  resolveTagCategoryIds: { weight: 2, message: 'resolving tag & category IDs' },
  snapshotExistingData: { weight: 5, message: 'snapshotting existing data' },
  writeCategoryAssociations: {
    message: 'writing category associations',
    weight: 8,
  },
  writeMetadata: { weight: 2, message: 'writing metadata' },
  writeRepositories: { weight: 20, message: 'writing repositories' },
  writeTagAssociations: { weight: 30, message: 'writing tag associations' },
  writeTags: { weight: 3, message: 'writing tags' },
} as const

// Execution order for cumulative weight calculation
const BULK_WRITE_STEP_ORDER = [
  'snapshotExistingData',
  'clearOldData',
  'writeRepositories',
  'resolveRepoIds',
  'writeTags',
  'resolveTagCategoryIds',
  'writeMetadata',
  'linkRepositories',
  'writeTagAssociations',
  'writeCategoryAssociations',
] as const

type BulkWriteStep = keyof typeof BULK_WRITE_STEPS
interface CollectedData {
  metadata: CollectedMetadata[]
  registryRepos: CollectedRegistryRepo[]
  repoCategories: CollectedRepoCategory[]
  repos: Map<string, CollectedRepo>
  repoTags: CollectedRepoTag[]
  tags: Map<string, { name: string; slug: string }>
}

interface CollectedMetadata {
  description: string
  lastUpdated: string
  registryName: string
  sourceRepository: string
  title: string
  totalItems: number
  totalStars: number
}

interface CollectedRegistryRepo {
  registryName: string
  repoKey: string
  title: string
}

// ============================================================
// In-memory data collection types
// ============================================================

interface CollectedRepo {
  archived: number
  description: null | string
  language: null | string
  lastCommit: string
  name: string
  owner: string
  stars: number
}

interface CollectedRepoCategory {
  categorySlug: string
  registryName: string
  repoKey: string
}

interface CollectedRepoTag {
  categorySlug: null | string
  registryName: string
  repoKey: string
  tagSlug: string
}

interface ExistingRegistrySnapshot {
  metadataRows: unknown[][]
  registryNames: string[]
  registryRepoRows: unknown[][]
  repoCategoryRows: unknown[][]
  repoTagRows: unknown[][]
}

type ProgressReporter = (step: BulkWriteStep) => Promise<void>

/**
 * Build multi-row INSERT statements respecting D1 bind parameter limits.
 * Returns array of { sql, binds } chunks.
 */
function buildMultiRowInserts(
  sql: string, // e.g. "INSERT OR IGNORE INTO repositories (owner, name, ...) VALUES"
  columnsCount: number,
  rows: unknown[][],
): { binds: unknown[]; sql: string }[] {
  const rowsPerStatement = Math.floor(D1_MAX_BIND_PARAMS / columnsCount)
  const results: { binds: unknown[]; sql: string }[] = []

  for (let i = 0; i < rows.length; i += rowsPerStatement) {
    const chunk = rows.slice(i, i + rowsPerStatement)
    const placeholders = chunk
      .map(() => `(${Array(columnsCount).fill('?').join(', ')})`)
      .join(', ')
    results.push({
      sql: `${sql} ${placeholders}`,
      binds: chunk.flat(),
    })
  }

  return results
}

/**
 * Write all collected data to D1 in bulk.
 * Uses multi-row INSERTs with resolved integer IDs.
 */
async function bulkWriteCollectedData(
  db: D1Database,
  collected: CollectedData,
  report: ProgressReporter,
): Promise<void> {
  const registryNames = [
    ...new Set(collected.metadata.map(m => m.registryName)),
  ]
  const snapshot = await snapshotExistingRegistryData(db, registryNames)
  await report('snapshotExistingData')

  try {
    // 1. Delete old data for all registries being indexed
    const deleteStatements: D1PreparedStatement[] = []
    for (const name of registryNames) {
      deleteStatements.push(
        db.prepare('DELETE FROM repo_tags WHERE registry_name = ?').bind(name),
        db
          .prepare(
            'DELETE FROM registry_repository_categories WHERE registry_name = ?',
          )
          .bind(name),
        db
          .prepare('DELETE FROM registry_repositories WHERE registry_name = ?')
          .bind(name),
        db
          .prepare('DELETE FROM registry_metadata WHERE registry_name = ?')
          .bind(name),
      )
    }
    await executeBatched(db, deleteStatements)
    await report('clearOldData')

    // 2. Bulk upsert repositories
    const repoRows = Array.from(collected.repos.values()).map(r => [
      r.owner,
      r.name,
      r.description,
      r.stars,
      r.language,
      r.lastCommit,
      r.archived,
    ])
    if (repoRows.length > 0) {
      const repoInserts = buildMultiRowInserts(
        'INSERT OR IGNORE INTO repositories (owner, name, description, stars, language, last_commit, archived) VALUES',
        7,
        repoRows,
      )
      await executeBatched(
        db,
        repoInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('writeRepositories')

    // 3. Resolve IDs for only the rows we need
    const repoIdMap = await fetchRepoIds(db, Array.from(collected.repos.keys()))
    await report('resolveRepoIds')

    // 4. Bulk upsert tags
    const tagRows = Array.from(collected.tags.values()).map(t => [
      t.slug,
      t.name,
    ])
    if (tagRows.length > 0) {
      const tagInserts = buildMultiRowInserts(
        'INSERT OR IGNORE INTO tags (slug, name) VALUES',
        2,
        tagRows,
      )
      await executeBatched(
        db,
        tagInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('writeTags')

    // 5. Resolve IDs for only the slugs we need
    const tagIdMap = await fetchSlugIds(db, 'tags', [...collected.tags.keys()])
    const neededCategorySlugs = new Set<string>()
    for (const repoCategory of collected.repoCategories) {
      neededCategorySlugs.add(repoCategory.categorySlug)
    }
    for (const repoTag of collected.repoTags) {
      if (repoTag.categorySlug) {
        neededCategorySlugs.add(repoTag.categorySlug)
      }
    }
    const categoryIdMap = await fetchSlugIds(db, 'categories', [
      ...neededCategorySlugs,
    ])
    await report('resolveTagCategoryIds')

    // 6. Bulk insert registry_metadata
    const metadataRows = collected.metadata.map(m => [
      m.registryName,
      m.title,
      m.description,
      m.lastUpdated,
      m.sourceRepository,
      m.totalItems,
      m.totalStars,
    ])
    if (metadataRows.length > 0) {
      const metaInserts = buildMultiRowInserts(
        'INSERT INTO registry_metadata (registry_name, title, description, last_updated, source_repository, total_items, total_stars) VALUES',
        7,
        metadataRows,
      )
      await executeBatched(
        db,
        metaInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('writeMetadata')

    // 7. Bulk insert registry_repositories with resolved IDs
    const regRepoRows = collected.registryRepos
      .map(rr => {
        const repoId = repoIdMap.get(rr.repoKey)
        if (repoId === undefined) {
          console.warn(
            '[indexer] Missing repository ID for registry_repositories row',
            {
              registryName: rr.registryName,
              repoKey: rr.repoKey,
            },
          )
          return null
        }
        return [rr.registryName, repoId, rr.title] as (number | string)[]
      })
      .filter((r): r is (number | string)[] => r !== null)
    if (regRepoRows.length > 0) {
      const rrInserts = buildMultiRowInserts(
        'INSERT INTO registry_repositories (registry_name, repository_id, title) VALUES',
        3,
        regRepoRows,
      )
      await executeBatched(
        db,
        rrInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('linkRepositories')

    // 8. Bulk insert repo_tags with resolved IDs
    const repoTagRows = collected.repoTags
      .map(rt => {
        const repoId = repoIdMap.get(rt.repoKey)
        const tagId = tagIdMap.get(rt.tagSlug)
        if (repoId === undefined) {
          console.warn('[indexer] Missing repository ID for repo_tags row', {
            registryName: rt.registryName,
            repoKey: rt.repoKey,
            tagSlug: rt.tagSlug,
          })
          return null
        }
        if (tagId === undefined) {
          console.warn('[indexer] Missing tag ID for repo_tags row', {
            registryName: rt.registryName,
            repoKey: rt.repoKey,
            tagSlug: rt.tagSlug,
          })
          return null
        }
        if (rt.categorySlug) {
          const categoryId = categoryIdMap.get(rt.categorySlug)
          if (!categoryId) return null
          return [repoId, rt.registryName, tagId, categoryId] as (
            | null
            | number
            | string
          )[]
        }
        return [repoId, rt.registryName, tagId, null] as (
          | null
          | number
          | string
        )[]
      })
      .filter((r): r is (null | number | string)[] => r !== null)
    if (repoTagRows.length > 0) {
      const rtInserts = buildMultiRowInserts(
        'INSERT INTO repo_tags (repository_id, registry_name, tag_id, category_id) VALUES',
        4,
        repoTagRows,
      )
      await executeBatched(
        db,
        rtInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('writeTagAssociations')

    // 9. Bulk insert registry_repository_categories with resolved IDs
    const repoCatRows = collected.repoCategories
      .map(rc => {
        const repoId = repoIdMap.get(rc.repoKey)
        const categoryId = categoryIdMap.get(rc.categorySlug)
        if (repoId === undefined) {
          console.warn(
            '[indexer] Missing repository ID for registry_repository_categories row',
            {
              registryName: rc.registryName,
              repoKey: rc.repoKey,
              categorySlug: rc.categorySlug,
            },
          )
          return null
        }
        if (!categoryId) return null
        return [rc.registryName, repoId, categoryId] as (number | string)[]
      })
      .filter((r): r is (number | string)[] => r !== null)
    if (repoCatRows.length > 0) {
      const rcInserts = buildMultiRowInserts(
        'INSERT INTO registry_repository_categories (registry_name, repository_id, category_id) VALUES',
        3,
        repoCatRows,
      )
      await executeBatched(
        db,
        rcInserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
      )
    }
    await report('writeCategoryAssociations')
  } catch (error) {
    await restoreExistingRegistryData(db, snapshot)
    throw error
  }
}

/**
 * Collect all indexable data from a registry into in-memory structures.
 * Pure computation — no DB calls.
 */
function collectRegistryData(
  registryName: string,
  data: RegistryData,
  collected: CollectedData,
): { itemCount: number } {
  const { items, totalStars } = flattenItems(data)

  collected.metadata.push({
    registryName,
    title: data.metadata.title,
    description: data.metadata.source_repository_description || '',
    lastUpdated: data.metadata.last_updated,
    sourceRepository: data.metadata.source_repository,
    totalItems: items.length,
    totalStars,
  })

  // Collect headings per repo (same logic as buildRegistryStatements first pass)
  const repoHeadings = new Map<string, Set<string>>()
  const repoTitles = new Map<string, string>()

  for (const item of items) {
    const repoInfo = item.data.repo_info
    if (!repoInfo?.owner || !repoInfo.repo) continue
    const key = `${repoInfo.owner}/${repoInfo.repo}`

    if (!repoHeadings.has(key)) {
      repoHeadings.set(key, new Set())
      repoTitles.set(key, item.data.title)

      // Collect unique repo
      if (!collected.repos.has(key)) {
        collected.repos.set(key, {
          owner: repoInfo.owner,
          name: repoInfo.repo,
          description: item.data.description ?? null,
          stars: repoInfo.stars,
          language: repoInfo.language,
          lastCommit: repoInfo.last_commit,
          archived: repoInfo.archived ? 1 : 0,
        })
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    repoHeadings.get(key)!.add(item.category)
  }

  // Collect junction rows
  for (const [repoKey, headingSet] of repoHeadings) {
    collected.registryRepos.push({
      registryName,
      repoKey,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      title: repoTitles.get(repoKey)!,
    })

    const uniqueCategories = new Map<string, string>()

    for (const rawHeading of headingSet) {
      const normalizedTag = normalizeTagName(rawHeading)
      if (!normalizedTag) continue

      // Collect unique tag
      if (!collected.tags.has(normalizedTag.slug)) {
        collected.tags.set(normalizedTag.slug, normalizedTag)
      }

      const normalizedCategory = normalizeCategoryName(rawHeading)

      collected.repoTags.push({
        repoKey,
        registryName,
        tagSlug: normalizedTag.slug,
        categorySlug: normalizedCategory?.slug ?? null,
      })

      if (
        normalizedCategory &&
        !uniqueCategories.has(normalizedCategory.slug)
      ) {
        uniqueCategories.set(normalizedCategory.slug, normalizedCategory.slug)
        collected.repoCategories.push({
          registryName,
          repoKey,
          categorySlug: normalizedCategory.slug,
        })
      }
    }
  }

  return { itemCount: items.length }
}

function createCollectedData(): CollectedData {
  return {
    repos: new Map(),
    tags: new Map(),
    metadata: [],
    registryRepos: [],
    repoTags: [],
    repoCategories: [],
  }
}

/**
 * Execute an array of prepared statements in D1 batches of 100.
 */
async function executeBatched(
  db: D1Database,
  statements: D1PreparedStatement[],
): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_MAX_BATCH_STATEMENTS) {
    const batch = statements.slice(i, i + D1_MAX_BATCH_STATEMENTS)
    await db.batch(batch)
  }
}

async function executeMultiRowInsert(
  db: D1Database,
  sqlPrefix: string,
  columnsCount: number,
  rows: unknown[][],
): Promise<void> {
  if (rows.length === 0) {
    return
  }

  const inserts = buildMultiRowInserts(sqlPrefix, columnsCount, rows)
  await executeBatched(
    db,
    inserts.map(({ sql, binds }) => db.prepare(sql).bind(...binds)),
  )
}

async function fetchRepoIds(
  db: D1Database,
  repoKeys: string[],
): Promise<Map<string, number>> {
  const repoIdMap = new Map<string, number>()

  if (repoKeys.length === 0) {
    return repoIdMap
  }

  const repoPairs = repoKeys.map(key => {
    const [owner, ...nameParts] = key.split('/')
    return [owner, nameParts.join('/')]
  })
  const pairsPerChunk = Math.floor(D1_MAX_BIND_PARAMS / 2)

  for (let i = 0; i < repoPairs.length; i += pairsPerChunk) {
    const chunk = repoPairs.slice(i, i + pairsPerChunk)
    const whereClause = chunk.map(() => '(owner = ? AND name = ?)').join(' OR ')
    const binds = chunk.flat()
    const result = await db
      .prepare(`SELECT id, owner, name FROM repositories WHERE ${whereClause}`)
      .bind(...binds)
      .all<{ id: number; name: string; owner: string }>()
    for (const repo of result.results) {
      repoIdMap.set(`${repo.owner}/${repo.name}`, repo.id)
    }
  }

  return repoIdMap
}

async function fetchRowsByRegistryNames(
  db: D1Database,
  sqlTemplate: string,
  registryNames: string[],
  mapRow: (row: Record<string, unknown>) => unknown[],
): Promise<unknown[][]> {
  const rows: unknown[][] = []
  const uniqueNames = [...new Set(registryNames)]

  for (let i = 0; i < uniqueNames.length; i += D1_MAX_BIND_PARAMS) {
    const chunk = uniqueNames.slice(i, i + D1_MAX_BIND_PARAMS)
    const placeholders = chunk.map(() => '?').join(', ')
    const sql = sqlTemplate.replace('{placeholders}', placeholders)
    const result = await db
      .prepare(sql)
      .bind(...chunk)
      .all()
    for (const row of result.results) {
      rows.push(mapRow(row))
    }
  }

  return rows
}

async function fetchSlugIds(
  db: D1Database,
  table: 'categories' | 'tags',
  slugs: string[],
): Promise<Map<string, number>> {
  const idMap = new Map<string, number>()

  if (slugs.length === 0) {
    return idMap
  }

  const uniqueSlugs = [...new Set(slugs)]

  for (let i = 0; i < uniqueSlugs.length; i += D1_MAX_BIND_PARAMS) {
    const chunk = uniqueSlugs.slice(i, i + D1_MAX_BIND_PARAMS)
    const placeholders = chunk.map(() => '?').join(', ')
    const result = await db
      .prepare(`SELECT id, slug FROM ${table} WHERE slug IN (${placeholders})`)
      .bind(...chunk)
      .all<{ id: number; slug: string }>()
    for (const row of result.results) {
      idMap.set(row.slug, row.id)
    }
  }

  return idMap
}

async function restoreExistingRegistryData(
  db: D1Database,
  snapshot: ExistingRegistrySnapshot,
): Promise<void> {
  const deleteStatements: D1PreparedStatement[] = []
  for (const registryName of snapshot.registryNames) {
    deleteStatements.push(
      db
        .prepare('DELETE FROM repo_tags WHERE registry_name = ?')
        .bind(registryName),
      db
        .prepare(
          'DELETE FROM registry_repository_categories WHERE registry_name = ?',
        )
        .bind(registryName),
      db
        .prepare('DELETE FROM registry_repositories WHERE registry_name = ?')
        .bind(registryName),
      db
        .prepare('DELETE FROM registry_metadata WHERE registry_name = ?')
        .bind(registryName),
    )
  }
  await executeBatched(db, deleteStatements)

  await executeMultiRowInsert(
    db,
    'INSERT OR REPLACE INTO registry_metadata (registry_name, title, description, last_updated, source_repository, total_items, total_stars) VALUES',
    7,
    snapshot.metadataRows,
  )
  await executeMultiRowInsert(
    db,
    'INSERT OR REPLACE INTO registry_repositories (registry_name, repository_id, title) VALUES',
    3,
    snapshot.registryRepoRows,
  )
  await executeMultiRowInsert(
    db,
    'INSERT OR REPLACE INTO repo_tags (repository_id, registry_name, tag_id, category_id) VALUES',
    4,
    snapshot.repoTagRows,
  )
  await executeMultiRowInsert(
    db,
    'INSERT OR REPLACE INTO registry_repository_categories (registry_name, repository_id, category_id) VALUES',
    3,
    snapshot.repoCategoryRows,
  )
}

async function snapshotExistingRegistryData(
  db: D1Database,
  registryNames: string[],
): Promise<ExistingRegistrySnapshot> {
  if (registryNames.length === 0) {
    return {
      registryNames: [],
      metadataRows: [],
      registryRepoRows: [],
      repoTagRows: [],
      repoCategoryRows: [],
    }
  }

  const metadataRows = await fetchRowsByRegistryNames(
    db,
    'SELECT registry_name, title, description, last_updated, source_repository, total_items, total_stars FROM registry_metadata WHERE registry_name IN ({placeholders})',
    registryNames,
    row => [
      row.registry_name,
      row.title,
      row.description,
      row.last_updated,
      row.source_repository,
      row.total_items,
      row.total_stars,
    ],
  )
  const registryRepoRows = await fetchRowsByRegistryNames(
    db,
    'SELECT registry_name, repository_id, title FROM registry_repositories WHERE registry_name IN ({placeholders})',
    registryNames,
    row => [row.registry_name, row.repository_id, row.title],
  )
  const repoTagRows = await fetchRowsByRegistryNames(
    db,
    'SELECT repository_id, registry_name, tag_id, category_id FROM repo_tags WHERE registry_name IN ({placeholders})',
    registryNames,
    row => [row.repository_id, row.registry_name, row.tag_id, row.category_id],
  )
  const repoCategoryRows = await fetchRowsByRegistryNames(
    db,
    'SELECT registry_name, repository_id, category_id FROM registry_repository_categories WHERE registry_name IN ({placeholders})',
    registryNames,
    row => [row.registry_name, row.repository_id, row.category_id],
  )

  return {
    registryNames,
    metadataRows,
    registryRepoRows,
    repoTagRows,
    repoCategoryRows,
  }
}
