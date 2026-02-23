/**
 * Registry data indexer for Cloudflare D1
 * Fetches JSON files from enhansome-registry repo and indexes them into D1
 */

import JSZip from 'jszip'

import type { RegistryData, RegistryItem } from '@/types/registry'

import { generateSlug } from './utils/strings'

const REGISTRY_ARCHIVE_URL =
  'https://github.com/v1nvn/enhansome-registry/archive/refs/heads/main.zip'

// Batch processing configuration
const PROGRESS_UPDATE_BATCH_SIZE = 10 // Update progress every N registries
const SYNC_LOG_BATCH_SIZE = 100 // D1 batch API limit

interface FlattenedItem {
  category: string
  data: RegistryItem
}

// In-memory tracking structures
interface ProgressBuffer {
  currentRegistry: null | string
  processedCount: number
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

  const historyId = await createHistoryEntry(db, triggerSource, createdBy)
  await updateLatestStatus(db, 'running', historyId)

  const progressBuffer = createProgressBuffer()
  const syncLogBuffer: SyncLogEntry[] = []

  try {
    const files = await fetchRegistryFiles(archiveUrl)
    console.log(`Found ${files.size} registry files to index`)

    await db
      .prepare('UPDATE indexing_history SET total_registries = ? WHERE id = ?')
      .bind(files.size, historyId)
      .run()

    const result = await processRegistries(db, files, historyId)

    // Final flush
    if (progressBuffer.processedCount > 0 || syncLogBuffer.length > 0) {
      await flushProgressBatch(db, historyId, progressBuffer, syncLogBuffer)
    }

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
    // Flush pending progress before marking as failed
    if (progressBuffer.processedCount > 0 || syncLogBuffer.length > 0) {
      try {
        await flushProgressBatch(db, historyId, progressBuffer, syncLogBuffer)
      } catch (flushError) {
        console.error('Failed to flush progress on error:', flushError)
      }
    }

    const errorMsg = error instanceof Error ? error.message : String(error)
    await completeHistoryEntry(db, historyId, 'failed', 0, 0, [], errorMsg)
    await updateLatestStatus(db, 'failed')

    console.error('Indexing failed:', error)
    throw error
  }
}

/**
 * Index a single registry into D1 using batch operations
 */
export async function indexRegistry(
  db: D1Database,
  registryName: string,
  data: RegistryData,
): Promise<number> {
  console.log(`Indexing registry: ${registryName}`)

  const { items, totalStars } = flattenItems(data)
  console.log(
    `  Found ${items.length} items, ${totalStars.toLocaleString()} total stars`,
  )

  const statements = buildRegistryStatements(
    db,
    registryName,
    data,
    items,
    totalStars,
  )

  for (let i = 0; i < statements.length; i += SYNC_LOG_BATCH_SIZE) {
    const batch = statements.slice(i, i + SYNC_LOG_BATCH_SIZE)
    await db.batch(batch)
    console.log(
      `  Executed batch ${Math.floor(i / SYNC_LOG_BATCH_SIZE) + 1}/${Math.ceil(statements.length / SYNC_LOG_BATCH_SIZE)}`,
    )
  }

  console.log(`  Successfully indexed ${registryName}`)
  return items.length
}

/**
 * Build all D1 statements for indexing a registry
 * Uses the many-to-many model with repositories + category junction table
 */
function buildRegistryStatements(
  db: D1Database,
  registryName: string,
  data: RegistryData,
  items: FlattenedItem[],
  totalStars: number,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = []

  // Clear existing junction table entries for this registry
  statements.push(
    db
      .prepare(
        'DELETE FROM registry_repository_categories WHERE registry_name = ?',
      )
      .bind(registryName),
  )
  statements.push(
    db
      .prepare('DELETE FROM registry_repositories WHERE registry_name = ?')
      .bind(registryName),
  )
  statements.push(
    db
      .prepare('DELETE FROM registry_metadata WHERE registry_name = ?')
      .bind(registryName),
  )

  // Insert metadata
  statements.push(
    db
      .prepare(
        `INSERT INTO registry_metadata
       (registry_name, title, description, last_updated, source_repository, total_items, total_stars)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        registryName,
        data.metadata.title,
        data.metadata.source_repository_description || '',
        data.metadata.last_updated,
        data.metadata.source_repository,
        items.length,
        totalStars,
      ),
  )

  // Collect categories per repository to handle multi-category repos
  const repoCategories = new Map<string, Set<string>>() // key: "owner/repo", value: Set of categories
  const repoTitles = new Map<string, string>() // key: "owner/repo", value: title (use first encountered)
  const repoDescriptions = new Map<string, null | string>() // key: "owner/repo", value: description

  // First pass: collect all categories for each unique repository
  for (const item of items) {
    const repoInfo = item.data.repo_info
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!repoInfo?.owner || !repoInfo?.repo) {
      continue
    }

    const key = `${repoInfo.owner}/${repoInfo.repo}`

    if (!repoCategories.has(key)) {
      repoCategories.set(key, new Set())
      repoTitles.set(key, item.data.title)
      repoDescriptions.set(key, item.data.description ?? null)
    }
    const categorySet = repoCategories.get(key)
    if (categorySet) {
      categorySet.add(item.category)
    }
  }

  // Second pass: insert each unique repository once with all its categories
  for (const item of items) {
    const repoInfo = item.data.repo_info
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!repoInfo?.owner || !repoInfo?.repo) {
      continue
    }

    const key = `${repoInfo.owner}/${repoInfo.repo}`

    // Only process if we haven't already inserted this repository
    if (!repoCategories.has(key)) {
      continue
    }

    // Get accumulated categories
    const categorySet = repoCategories.get(key)
    const categories = categorySet ? Array.from(categorySet) : []
    const title = repoTitles.get(key)
    const description = repoDescriptions.get(key)

    // Upsert repository (INSERT OR IGNORE)
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO repositories (owner, name, description, stars, language, last_commit, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          repoInfo.owner,
          repoInfo.repo,
          description,
          repoInfo.stars,
          repoInfo.language,
          repoInfo.last_commit,
          repoInfo.archived ? 1 : 0,
        ),
    )

    // Link via junction table
    statements.push(
      db
        .prepare(
          `INSERT INTO registry_repositories (registry_name, repository_id, title)
           SELECT ?, id, ?
           FROM repositories
           WHERE owner = ? AND name = ?`,
        )
        .bind(registryName, title, repoInfo.owner, repoInfo.repo),
    )

    // Link each category via junction table
    // We need to get the category ID for each category name
    for (const categoryName of categories) {
      // First, try to find existing category by name
      // Since we can't use getOrCreateCategory here (it's async), we'll use a different approach:
      // Insert the category if it doesn't exist (INSERT OR IGNORE), then get its ID
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO categories (slug, name)
             VALUES (?, ?)`,
          )
          .bind(
            // Generate slug from category name using shared utility
            generateSlug(categoryName),
            categoryName,
          ),
      )

      // Now link the repository to the category
      // We need to get the repository_id and category_id, then insert into junction table
      // Since we can't use subqueries with binds easily, we'll use a different approach:
      statements.push(
        db
          .prepare(
            `INSERT INTO registry_repository_categories (registry_name, repository_id, category_id)
             SELECT ?, r.id, c.id
             FROM repositories r
             CROSS JOIN categories c
             WHERE r.owner = ? AND r.name = ? AND c.name = ?`,
          )
          .bind(registryName, repoInfo.owner, repoInfo.repo, categoryName),
      )
    }

    // Remove from map so we don't insert again
    repoCategories.delete(key)
    repoTitles.delete(key)
    repoDescriptions.delete(key)
  }

  return statements
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
             current_registry = NULL
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
             current_registry = NULL
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
 * Create a new progress buffer
 */
function createProgressBuffer(): ProgressBuffer {
  return {
    currentRegistry: null,
    processedCount: 0,
  }
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
 * Flush buffered progress updates and sync_log entries to database in a single batch
 */
async function flushProgressBatch(
  db: D1Database,
  historyId: number,
  progress: ProgressBuffer,
  syncLogEntries: SyncLogEntry[],
): Promise<void> {
  if (progress.processedCount === 0 && syncLogEntries.length === 0) {
    return
  }

  const statements: D1PreparedStatement[] = []

  // Update indexing_history progress
  if (progress.processedCount > 0) {
    statements.push(
      db
        .prepare(
          `UPDATE indexing_history
           SET current_registry = ?,
               processed_registries = processed_registries + ?
           WHERE id = ?`,
        )
        .bind(progress.currentRegistry, progress.processedCount, historyId),
    )
  }

  // Insert sync_log entries
  for (const entry of syncLogEntries) {
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

  // Update indexing_latest timestamp
  statements.push(
    db
      .prepare('UPDATE indexing_latest SET updated_at = ? WHERE id = 1')
      .bind(new Date().toISOString()),
  )

  // Execute in batches (D1 has a 100 statement limit per batch)
  for (let i = 0; i < statements.length; i += SYNC_LOG_BATCH_SIZE) {
    const batch = statements.slice(i, i + SYNC_LOG_BATCH_SIZE)
    await db.batch(batch)
  }

  console.log(
    `Flushed batch: ${progress.processedCount} registries, ${syncLogEntries.length} log entries`,
  )
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
 * Process all registries with batched progress tracking
 */
async function processRegistries(
  db: D1Database,
  files: Map<string, RegistryData>,
  historyId: number,
): Promise<{ errors: string[]; failed: number; success: number }> {
  const errors: string[] = []
  let failed = 0
  let success = 0
  let registryCount = 0
  let progressBuffer = createProgressBuffer()
  let syncLogBuffer: SyncLogEntry[] = []

  for (const [registryName, data] of files.entries()) {
    try {
      const itemsSynced = await indexRegistry(db, registryName, data)
      progressBuffer.currentRegistry = registryName
      progressBuffer.processedCount++
      syncLogBuffer.push({ registryName, status: 'success', itemsSynced })
      success++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`${registryName}: ${errorMsg}`)
      console.error(`Error indexing ${registryName}:`, error)
      syncLogBuffer.push({
        registryName,
        status: 'error',
        errorMessage: errorMsg,
      })
      failed++
    }

    registryCount++

    // Flush batch every N registries
    if (registryCount % PROGRESS_UPDATE_BATCH_SIZE === 0) {
      await flushProgressBatch(db, historyId, progressBuffer, syncLogBuffer)
      progressBuffer = createProgressBuffer()
      syncLogBuffer = []
    }
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
