/**
 * Registry data indexer for Cloudflare D1
 * Fetches JSON files from enhansome-registry repo and indexes them into D1
 */

import JSZip from 'jszip'

import type { RegistryData, RegistryItem } from '@/types/registry'

const REGISTRY_ARCHIVE_URL =
  'https://github.com/v1nvn/enhansome-registry/archive/refs/heads/main.zip'
const REGISTRY_RAW_BASE_URL =
  'https://raw.githubusercontent.com/v1nvn/enhansome-registry/main'

interface FlattenedItem {
  category: string
  data: RegistryItem
}

/**
 * Discover all available registries by fetching and scanning the repo archive
 * Returns array of registry paths like ["v1nvn/enhansome-go", "v1nvn/enhansome-mcp-servers"]
 * @param archiveUrl - Optional override URL for testing (defaults to REGISTRY_ARCHIVE_URL)
 */
export async function discoverRegistries(
  archiveUrl?: string,
): Promise<string[]> {
  const url = archiveUrl || REGISTRY_ARCHIVE_URL
  console.log('Discovering registries from GitHub archive...')

  try {
    // Fetch the repo archive
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch archive: ${response.status}`)
    }

    // Get zip data as ArrayBuffer
    const zipData = await response.arrayBuffer()
    const zip = await JSZip.loadAsync(zipData)

    // Discover all repos/*/*/index.json paths
    const registries: string[] = []

    // Dynamic prefix detection - find the repos/ directory
    // Zip could be named "enhansome-registry-main" or "enhansome-registry-<sha>"
    let repoPrefix = ''
    for (const path of Object.keys(zip.files)) {
      if (path.includes('/repos/') && path.endsWith('/index.json')) {
        const prefixEnd = path.indexOf('/repos/')
        repoPrefix = path.slice(0, prefixEnd + 1) // Include trailing slash
        break
      }
    }

    if (!repoPrefix) {
      throw new Error('Could not find repos/ directory in archive')
    }

    for (const [path, file] of Object.entries(zip.files)) {
      // Skip files not in repos/ directory
      if (!path.startsWith(`${repoPrefix}repos/`)) continue
      // Skip directories
      if (file.dir) continue

      // Check if it's an index.json file
      if (path.endsWith('/index.json')) {
        // Extract owner/repo from path
        // Path format: enhansome-registry-<sha>/repos/owner/repo/index.json
        const relativePath = path.slice(`${repoPrefix}repos/`.length)
        const parts = relativePath.split('/')
        if (parts.length >= 2) {
          const owner = parts[0]
          const repo = parts[1]
          registries.push(`${owner}/${repo}`)
        }
      }
    }

    console.log(`  ✓ Discovered ${registries.length} registries`)
    return registries
  } catch (error) {
    console.error('Error discovering registries:', error)
    throw error
  }
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
 * Uses dynamic discovery to find all available registries
 */
export async function fetchRegistryFiles(): Promise<Map<string, RegistryData>> {
  const files = new Map<string, RegistryData>()

  // Step 1: Discover all available registries
  const registries = await discoverRegistries()

  // Step 2: Fetch data.json for each discovered registry
  await Promise.all(
    registries.map(async ownerRepo => {
      try {
        const url = constructRegistryDataUrl(ownerRepo)
        const response = await fetch(url)

        if (!response.ok) {
          console.warn(
            `  ✗ Skipped ${ownerRepo}: ${response.status} (data.json not found)`,
          )
          return
        }

        const jsonData: unknown = await response.json()

        // Validate JSON structure
        if (
          !jsonData ||
          typeof jsonData !== 'object' ||
          !('items' in jsonData) ||
          !('metadata' in jsonData)
        ) {
          console.warn(`  ✗ Skipped ${ownerRepo}: Invalid data structure`)
          return
        }

        const data = jsonData as RegistryData

        // Extract registry name: "v1nvn/enhansome-go" -> "go"
        const registryName = extractRegistryName(ownerRepo)

        files.set(registryName, data)
        console.log(`  ✓ Fetched ${registryName}`)
      } catch (error) {
        console.error(`  ✗ Error fetching ${ownerRepo}:`, error)
        // Continue with other registries
      }
    }),
  )

  return files
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
 * @param db - D1 database instance
 * @param triggerSource - 'manual' or 'scheduled'
 * @param createdBy - API key identifier (last 4 chars) for manual runs, optional
 * @returns Summary of success/failure
 */
export async function indexAllRegistries(
  db: D1Database,
  triggerSource: 'manual' | 'scheduled' = 'scheduled',
  createdBy?: string,
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

  // Check if indexing is already in progress
  const latestResult = await db
    .prepare('SELECT status FROM indexing_latest WHERE id = 1')
    .first<{ status: string }>()

  if (latestResult?.status === 'running') {
    console.log('Indexing already in progress, skipping...')
    return { success: 0, failed: 0, errors: ['Indexing already in progress'] }
  }

  // Create history entry and update latest status
  const historyId = await createHistoryEntry(db, triggerSource, createdBy)
  await updateLatestStatus(db, 'running', historyId)

  try {
    const files = await fetchRegistryFiles()
    console.log(`Found ${files.size} registry files to index`)

    // Update history with total count
    await db
      .prepare('UPDATE indexing_history SET total_registries = ? WHERE id = ?')
      .bind(files.size, historyId)
      .run()

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const [registryName, data] of files.entries()) {
      try {
        // Update progress: which registry we're processing
        await db
          .prepare(
            `UPDATE indexing_history
             SET current_registry = ?, processed_registries = processed_registries + 1
             WHERE id = ?`,
          )
          .bind(registryName, historyId)
          .run()

        // Update latest status timestamp
        await db
          .prepare('UPDATE indexing_latest SET updated_at = ? WHERE id = 1')
          .bind(new Date().toISOString())
          .run()

        await indexRegistry(db, registryName, data)
        success++
      } catch (error) {
        failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`${registryName}: ${errorMsg}`)
        console.error(`Error indexing ${registryName}:`, error)

        // Log error to sync_log
        try {
          await db
            .prepare(
              `INSERT INTO sync_log (registry_name, status, error_message) VALUES (?, ?, ?)`,
            )
            .bind(registryName, 'error', errorMsg)
            .run()
        } catch (logError) {
          console.error('Failed to log error to sync_log:', logError)
        }
      }
    }

    // Mark as completed
    await completeHistoryEntry(
      db,
      historyId,
      'completed',
      success,
      failed,
      errors,
    )
    await updateLatestStatus(db, 'completed')

    console.log(`\n✓ Indexing complete: ${success} succeeded, ${failed} failed`)

    return { success, failed, errors }
  } catch (error) {
    // Mark as failed
    const errorMsg = error instanceof Error ? error.message : String(error)
    await completeHistoryEntry(db, historyId, 'failed', 0, 0, [], errorMsg)
    await updateLatestStatus(db, 'failed')

    console.error('❌ Indexing failed:', error)
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
): Promise<void> {
  console.log(`Indexing registry: ${registryName}`)

  const { items, totalStars } = flattenItems(data)
  console.log(
    `  Found ${items.length} items, ${totalStars.toLocaleString()} total stars`,
  )

  // Prepare all statements for batch execution
  const statements: D1PreparedStatement[] = []

  // Clear existing data for this registry
  statements.push(
    db
      .prepare('DELETE FROM registry_items WHERE registry_name = ?')
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

  // Insert items in batch
  for (const item of items) {
    statements.push(
      db
        .prepare(
          `INSERT INTO registry_items
          (registry_name, category, title, description, repo_owner, repo_name, stars, language, last_commit, archived)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          registryName,
          item.category,
          item.data.title,
          item.data.description || null,
          item.data.repo_info?.owner || null,
          item.data.repo_info?.repo || null,
          item.data.repo_info?.stars || 0,
          item.data.repo_info?.language || null,
          item.data.repo_info?.last_commit || null,
          item.data.repo_info?.archived ? 1 : 0,
        ),
    )
  }

  // Execute all statements in batches
  const batchSize = 100 // D1 batch API limit
  for (let i = 0; i < statements.length; i += batchSize) {
    const batch = statements.slice(i, i + batchSize)
    await db.batch(batch)
    console.log(
      `  Executed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(statements.length / batchSize)}`,
    )
  }

  // Log sync status
  await db
    .prepare(
      `INSERT INTO sync_log (registry_name, status, items_synced)
       VALUES (?, ?, ?)`,
    )
    .bind(registryName, 'success', items.length)
    .run()

  console.log(`  ✓ Successfully indexed ${registryName}`)
}

/**
 * Complete an indexing history entry
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
  const statusClause =
    status === 'completed'
      ? `status = 'completed', completed_at = ?, success_count = ?, failed_count = ?, errors = ?, current_registry = NULL`
      : `status = 'failed', completed_at = ?, error_message = ?, current_registry = NULL`

  const params =
    status === 'completed'
      ? [completedAt, success, failed, JSON.stringify(errors), historyId]
      : [completedAt, errorMessage, historyId]

  await db
    .prepare(`UPDATE indexing_history SET ${statusClause} WHERE id = ?`)
    .bind(...params)
    .run()
}

/**
 * Construct the data.json URL for a registry
 */
function constructRegistryDataUrl(ownerRepo: string): string {
  return `${REGISTRY_RAW_BASE_URL}/repos/${ownerRepo}/data.json`
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
 * Update the indexing_latest table status
 */
async function updateLatestStatus(
  db: D1Database,
  status: 'completed' | 'failed' | 'running',
  historyId?: number,
): Promise<void> {
  const historyIdClause =
    historyId !== undefined ? `history_id = ${historyId},` : ''
  await db
    .prepare(
      `UPDATE indexing_latest SET ${historyIdClause} status = ?, updated_at = ? WHERE id = 1`,
    )
    .bind(status, new Date().toISOString())
    .run()
}
