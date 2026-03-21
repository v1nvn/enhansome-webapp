/**
 * Registry data indexer for Cloudflare D1
 * Fetches JSON files from enhansome-registry repo and indexes them into D1
 *
 * Supports both direct execution and Cloudflare Workflows step-by-step execution.
 */

import JSZip from 'jszip'

import type { RegistryData, RegistryItem } from '@/types/registry'

import { normalizeCategoryName, seedCategories } from './utils/categories'
import { normalizeTagName } from './utils/tags'

const REGISTRY_ARCHIVE_URL =
  'https://github.com/v1nvn/enhansome-registry/archive/refs/heads/main.zip'

// D1 batch API limit
const D1_MAX_BATCH_STATEMENTS = 100

// Workflow step progress values (direct, not cumulative)
export const WORKFLOW_STEPS = {
  'fetch-and-collect': {
    progress: 10,
    message: 'fetching and collecting data',
  },
  'write-repositories': { progress: 25, message: 'writing repositories' },
  'write-tags-metadata': { progress: 40, message: 'writing tags and metadata' },
  'write-associations': { progress: 60, message: 'writing associations' },
  'write-categories': { progress: 70, message: 'writing categories' },
  'rebuild-facets': { progress: 85, message: 'rebuilding facets' },
  'rebuild-fts': { progress: 95, message: 'rebuilding search index' },
  finalize: { progress: 100, message: 'finalizing' },
} as const

export type WorkflowStepName = keyof typeof WORKFLOW_STEPS

interface FlattenedItem {
  category: string
  data: RegistryItem
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
 * Rebuild the FTS5 search index.
 * Called after rebuildFacets to populate the full-text search virtual table.
 */
export async function rebuildFtsIndex(db: D1Database): Promise<void> {
  console.log('Rebuilding FTS5 search index...')
  const deleteStmt = db.prepare('DELETE FROM repositories_fts')
  const insertStmt = db.prepare(
    `INSERT INTO repositories_fts(rowid, owner, name, description, language, registry_names, category_names, tag_names, stars, archived, last_commit)
     SELECT
       r.id,
       r.owner,
       r.name,
       r.description,
       r.language,
       GROUP_CONCAT(DISTINCT f.registry_name) as registry_names,
       GROUP_CONCAT(DISTINCT f.category_name) as category_names,
       GROUP_CONCAT(DISTINCT f.tag_name) as tag_names,
       r.stars,
       r.archived,
       r.last_commit
     FROM repositories r
     LEFT JOIN repository_facets f ON r.id = f.repository_id
     GROUP BY r.id`,
  )
  await db.batch([deleteStmt, insertStmt])
  console.log('FTS5 search index rebuilt successfully')
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

// ============================================================
// In-memory data collection types (exported for workflow)
// ============================================================

export interface CollectedData {
  metadata: CollectedMetadata[]
  registryRepos: CollectedRegistryRepo[]
  repoCategories: CollectedRepoCategory[]
  repos: Map<string, CollectedRepo>
  repoTags: CollectedRepoTag[]
  tags: Map<string, { name: string; slug: string }>
}

export interface CollectedMetadata {
  description: string
  lastUpdated: string
  registryName: string
  sourceRepository: string
  title: string
  totalItems: number
  totalStars: number
}

export interface CollectedRegistryRepo {
  registryName: string
  repoKey: string
  title: string
}

export interface CollectedRepo {
  archived: number
  description: null | string
  language: null | string
  lastCommit: null | string
  name: string
  owner: string
  stars: number
}

export interface CollectedRepoCategory {
  categorySlug: string
  registryName: string
  repoKey: string
}

export interface CollectedRepoTag {
  categorySlug: null | string
  registryName: string
  repoKey: string
  tagSlug: string
}

// JSON-serializable version for workflow state (Maps converted to arrays)
export interface SerializableCollectedData {
  metadata: CollectedMetadata[]
  registryRepos: CollectedRegistryRepo[]
  repoCategories: CollectedRepoCategory[]
  repos: [string, CollectedRepo][]
  repoTags: CollectedRepoTag[]
  tags: [string, { name: string; slug: string }][]
}

export interface WorkflowContext {
  archiveUrl?: string
  createdBy?: string
  historyId: number
  triggerSource: 'manual' | 'scheduled'
}

interface ExistingRegistrySnapshot {
  metadataRows: unknown[][]
  registryNames: string[]
  registryRepoRows: unknown[][]
  repoCategoryRows: unknown[][]
  repoTagRows: unknown[][]
}

type ProgressReporter = (step: string) => Promise<void>

/**
 * Check if indexing is currently running
 */
export async function checkIsIndexingRunning(db: D1Database): Promise<boolean> {
  const latestResult = await db
    .prepare(
      'SELECT status FROM indexing_latest ORDER BY updated_at DESC LIMIT 1',
    )
    .first<{ status: string }>()
  return latestResult?.status === 'running'
}

export function collectedDataFromSerializable(
  data: SerializableCollectedData,
): CollectedData {
  return {
    metadata: data.metadata,
    registryRepos: data.registryRepos,
    repoCategories: data.repoCategories,
    repos: new Map(data.repos),
    repoTags: data.repoTags,
    tags: new Map(data.tags),
  }
}

export function collectedDataToSerializable(
  data: CollectedData,
): SerializableCollectedData {
  return {
    metadata: data.metadata,
    registryRepos: data.registryRepos,
    repoCategories: data.repoCategories,
    repos: Array.from(data.repos.entries()),
    repoTags: data.repoTags,
    tags: Array.from(data.tags.entries()),
  }
}

/**
 * Create indexing history entry for workflow
 */
export async function createWorkflowHistoryEntry(
  db: D1Database,
  triggerSource: 'manual' | 'scheduled',
  createdBy?: string,
): Promise<number> {
  return createHistoryEntry(db, triggerSource, createdBy)
}

/**
 * Step 1: Fetch and collect all registry data
 * Returns serializable collected data for workflow state
 */
export async function fetchAndCollectStep(
  db: D1Database,
  context: WorkflowContext,
): Promise<{
  collected: SerializableCollectedData
  errors: string[]
  failed: number
  success: number
  totalRegistries: number
}> {
  await updateWorkflowProgress(db, context.historyId, 'fetch-and-collect')

  // Seed categories from frozen set before indexing
  await seedCategories(db)

  const files = await fetchRegistryFiles(context.archiveUrl)
  const totalRegistries = files.size

  await db
    .prepare('UPDATE indexing_history SET total_registries = ? WHERE id = ?')
    .bind(totalRegistries, context.historyId)
    .run()

  const collected = createCollectedData()
  const errors: string[] = []
  let failed = 0
  let success = 0

  for (const [registryName, data] of files.entries()) {
    try {
      collectRegistryData(registryName, data, collected)
      success++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`${registryName}: ${errorMsg}`)
      console.error(`Error collecting ${registryName}:`, error)
      failed++
    }
  }

  console.log(
    `Collected: ${collected.repos.size} repos, ${collected.tags.size} tags, ` +
      `${collected.repoTags.length} repo-tag links, ${collected.repoCategories.length} category links`,
  )

  return {
    collected: collectedDataToSerializable(collected),
    errors,
    failed,
    success,
    totalRegistries,
  }
}

/**
 * Step 8: Finalize indexing
 */
export async function finalizeStep(
  db: D1Database,
  historyId: number,
  result: { errors: string[]; failed: number; success: number },
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'finalize')

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
}

/**
 * Mark indexing as failed
 */
export async function markIndexingFailed(
  db: D1Database,
  historyId: number,
  errorMessage: string,
): Promise<void> {
  await completeHistoryEntry(db, historyId, 'failed', 0, 0, [], errorMessage)
  await updateLatestStatus(db, 'failed')
}

/**
 * Step 6: Rebuild facets
 */
export async function rebuildFacetsStep(
  db: D1Database,
  historyId: number,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'rebuild-facets')
  await rebuildFacets(db)
}

/**
 * Step 7: Rebuild FTS index
 */
export async function rebuildFtsStep(
  db: D1Database,
  historyId: number,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'rebuild-fts')
  await rebuildFtsIndex(db)
}

/**
 * Set indexing as running
 */
export async function setIndexingRunning(
  db: D1Database,
  historyId: number,
): Promise<void> {
  await updateLatestStatus(db, 'running', historyId)
}

/**
 * Update progress for a workflow step
 */
export async function updateWorkflowProgress(
  db: D1Database,
  historyId: number,
  stepName: WorkflowStepName,
): Promise<void> {
  const { progress, message } = WORKFLOW_STEPS[stepName]
  console.log(`Progress: ${progress}% - ${message}`)
  await db
    .prepare(
      'UPDATE indexing_history SET progress = ?, current_step = ? WHERE id = ?',
    )
    .bind(progress, message, historyId)
    .run()
}

/**
 * Step 4: Write associations (registry_repositories and repo_tags)
 */
export async function writeAssociationsStep(
  db: D1Database,
  historyId: number,
  collectedData: SerializableCollectedData,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'write-associations')

  const collected = collectedDataFromSerializable(collectedData)

  // Resolve IDs
  const repoIdMap = await fetchRepoIds(db, Array.from(collected.repos.keys()))
  const tagIdMap = await fetchSlugIds(db, 'tags', [...collected.tags.keys()])

  // Build category slug set
  const neededCategorySlugs = new Set<string>()
  for (const rc of collected.repoCategories) {
    neededCategorySlugs.add(rc.categorySlug)
  }
  for (const rt of collected.repoTags) {
    if (rt.categorySlug) neededCategorySlugs.add(rt.categorySlug)
  }
  const categoryIdMap = await fetchSlugIds(db, 'categories', [
    ...neededCategorySlugs,
  ])

  // Bulk insert registry_repositories
  const regRepoRows = collected.registryRepos
    .map(rr => {
      const repoId = repoIdMap.get(rr.repoKey)
      if (repoId === undefined) return null
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

  // Bulk insert repo_tags
  const repoTagRows = collected.repoTags
    .map(rt => {
      const repoId = repoIdMap.get(rt.repoKey)
      const tagId = tagIdMap.get(rt.tagSlug)
      if (repoId === undefined || tagId === undefined) return null

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
}

// ============================================================
// Workflow Step Functions
// ============================================================

/**
 * Step 5: Write category associations
 */
export async function writeCategoriesStep(
  db: D1Database,
  historyId: number,
  collectedData: SerializableCollectedData,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'write-categories')

  const collected = collectedDataFromSerializable(collectedData)

  // Resolve IDs
  const repoIdMap = await fetchRepoIds(db, Array.from(collected.repos.keys()))
  const neededCategorySlugs = new Set(
    collected.repoCategories.map(rc => rc.categorySlug),
  )
  const categoryIdMap = await fetchSlugIds(db, 'categories', [
    ...neededCategorySlugs,
  ])

  // Bulk insert registry_repository_categories
  const repoCatRows = collected.repoCategories
    .map(rc => {
      const repoId = repoIdMap.get(rc.repoKey)
      const categoryId = categoryIdMap.get(rc.categorySlug)
      if (repoId === undefined || !categoryId) return null
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
}

/**
 * Step 2: Write repositories to D1
 */
export async function writeRepositoriesStep(
  db: D1Database,
  historyId: number,
  collectedData: SerializableCollectedData,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'write-repositories')

  const collected = collectedDataFromSerializable(collectedData)
  const registryNames = [
    ...new Set(collected.metadata.map(m => m.registryName)),
  ]

  // Delete old data for all registries
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

  // Bulk upsert repositories
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
}

/**
 * Step 3: Write tags and metadata
 */
export async function writeTagsAndMetadataStep(
  db: D1Database,
  historyId: number,
  collectedData: SerializableCollectedData,
): Promise<void> {
  await updateWorkflowProgress(db, historyId, 'write-tags-metadata')

  const collected = collectedDataFromSerializable(collectedData)

  // Bulk upsert tags
  const tagRows = Array.from(collected.tags.values()).map(t => [t.slug, t.name])
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

  // Bulk insert registry_metadata
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
}

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
  await report('snapshotting existing data')

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
    await report('clearing old data')

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
    await report('writing repositories')

    // 3. Resolve IDs for only the rows we need
    const repoIdMap = await fetchRepoIds(db, Array.from(collected.repos.keys()))
    await report('resolving repository IDs')

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
    await report('writing tags')

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
    await report('resolving tag & category IDs')

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
    await report('writing metadata')

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
    await report('linking repositories')

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
    await report('writing tag associations')

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
    await report('writing category associations')
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
