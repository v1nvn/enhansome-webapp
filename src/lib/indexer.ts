/**
 * Registry data indexer for Cloudflare D1
 * Fetches JSON files from enhansome-registry repo and indexes them into D1
 */

import type { RegistryData, RegistryItem } from '@/types/registry'

const REGISTRY_REPO_URL =
  'https://raw.githubusercontent.com/v1nvn/enhansome-registry/main/data'

interface FlattenedItem {
  category: string
  data: RegistryItem
}

/**
 * Extract registry name from filename
 * Example: "v1nvn_enhansome-go.json" -> "go"
 */
export function extractRegistryName(filename: string): string {
  return filename.replace('v1nvn_enhansome-', '').replace('.json', '')
}

/**
 * Fetch all registry JSON files from enhansome-registry repo
 * Known registries from allowlist
 */
export async function fetchRegistryFiles(): Promise<Map<string, RegistryData>> {
  // Registry files to fetch
  const registries = [
    'v1nvn_enhansome-selfhosted.json',
    'v1nvn_enhansome-go.json',
    'v1nvn_enhansome-mcp-servers.json',
    'v1nvn_enhansome-ffmpeg.json',
  ]

  const files = new Map<string, RegistryData>()

  await Promise.all(
    registries.map(async filename => {
      try {
        const url = `${REGISTRY_REPO_URL}/${filename}`
        const response = await fetch(url)

        if (!response.ok) {
          console.error(
            `Failed to fetch ${filename}: ${response.status} ${response.statusText}`,
          )
          return
        }

        const data = await response.json()
        const registryName = extractRegistryName(filename)
        files.set(registryName, data)
        console.log(`  ✓ Fetched ${registryName}`)
      } catch (error) {
        console.error(`Error fetching ${filename}:`, error)
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
 * Index all registries
 * Returns summary of success/failure
 */
export async function indexAllRegistries(db: D1Database): Promise<{
  errors: string[]
  failed: number
  success: number
}> {
  console.log('Starting D1 indexing process...')

  const files = await fetchRegistryFiles()
  console.log(`Found ${files.size} registry files to index`)

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const [registryName, data] of files.entries()) {
    try {
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
            `INSERT INTO sync_log (registry_name, status, error_message)
             VALUES (?, ?, ?)`,
          )
          .bind(registryName, 'error', errorMsg)
          .run()
      } catch (logError) {
        console.error('Failed to log error to sync_log:', logError)
      }
    }
  }

  console.log(`\n✓ Indexing complete: ${success} succeeded, ${failed} failed`)

  return { success, failed, errors }
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
