/**
 * Standalone registry indexer for GitHub Actions
 *
 * Uses wrangler's getPlatformProxy() to get D1 bindings in a Node.js context.
 * Reuses the core indexing functions from src/lib/indexer.ts.
 */

import { getPlatformProxy } from 'wrangler'

import {
  checkIsIndexingRunning,
  createWorkflowHistoryEntry,
  fetchAndCollectStep,
  finalizeStep,
  markIndexingFailed,
  rebuildFacetsStep,
  rebuildFtsStep,
  setIndexingRunning,
  writeAssociationsStep,
  writeCategoriesStep,
  writeRepositoriesStep,
  writeTagsAndMetadataStep,
} from '../src/lib/indexer.js'

interface IndexerOptions {
  /**
   * Custom archive URL for testing
   * @default Uses the default enhansome-registry archive URL
   */
  archiveUrl?: string

  /**
   * User who triggered the indexing
   */
  createdBy?: string

  /**
   * Trigger source
   * @default 'manual'
   */
  triggerSource?: 'manual' | 'scheduled'
}

/**
 * Run the complete indexing process
 */
export async function indexRegistry(options: IndexerOptions = {}): Promise<void> {
  const {
    archiveUrl,
    createdBy = 'github-actions',
    triggerSource = 'manual',
  } = options

  console.log(`Starting indexing workflow (source: ${triggerSource})`)

  // Get D1 binding via wrangler's platform proxy
  // Explicitly use production environment with remote bindings
  const proxy = await getPlatformProxy({
    configPath: './wrangler.jsonc',
  })
  const db = proxy.env.DB as D1Database

  // Debug: Verify we're connected to remote DB with tables
  const { results: tables } = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all<{ name: string }>()
  console.log('Connected to D1. Tables:', tables.map((t) => t.name))
  const isRunning = await checkIsIndexingRunning(db)
  if (isRunning) {
    console.log('Indexing already in progress, skipping...')
    return
  }

  // Create history entry
  const historyId = await createWorkflowHistoryEntry(db, triggerSource, createdBy)
  console.log(`Created indexing history entry: ${historyId}`)

  await setIndexingRunning(db, historyId)

  try {
    // Step 1: Fetch and collect all data
    const fetchResult = await fetchAndCollectStep(db, {
      archiveUrl,
      createdBy,
      historyId,
      triggerSource,
    })
    const collectedData = fetchResult.collected

    console.log(
      `Collected ${fetchResult.success} registries (${fetchResult.failed} failed)`,
    )

    // Step 2: Write repositories
    console.log('Writing repositories...')
    await writeRepositoriesStep(db, historyId, collectedData)

    // Step 3: Write tags and metadata
    console.log('Writing tags and metadata...')
    await writeTagsAndMetadataStep(db, historyId, collectedData)

    // Step 4: Write associations
    console.log('Writing associations...')
    await writeAssociationsStep(db, historyId, collectedData)

    // Step 5: Write categories
    console.log('Writing categories...')
    await writeCategoriesStep(db, historyId, collectedData)

    // Step 6: Rebuild facets
    console.log('Rebuilding facets...')
    await rebuildFacetsStep(db, historyId)

    // Step 7: Rebuild FTS index
    console.log('Rebuilding FTS search index...')
    await rebuildFtsStep(db, historyId)

    // Step 8: Finalize
    console.log('Finalizing...')
    await finalizeStep(
      db,
      historyId,
      {
        errors: fetchResult.errors,
        failed: fetchResult.failed,
        success: fetchResult.success,
      },
    )

    console.log(
      `\nIndexing complete: ${fetchResult.success} succeeded, ${fetchResult.failed} failed`,
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Indexing failed:', errorMsg)
    await markIndexingFailed(db, historyId, errorMsg)
    throw error
  } finally {
    // Clean up the proxy
    await proxy.dispose()
  }
}

// CLI entry point
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const archiveUrl = process.env.ARCHIVE_URL
  const triggerSource = process.env.TRIGGER_SOURCE as 'manual' | 'scheduled' | undefined

  indexRegistry({
    archiveUrl,
    triggerSource,
  })
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
