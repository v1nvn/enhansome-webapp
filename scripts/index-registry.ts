/**
 * Standalone registry indexer for GitHub Actions
 *
 * Uses wrangler's getPlatformProxy() to get D1 bindings in a Node.js context.
 * Reuses the core indexing functions from src/lib/indexer.ts.
 */

import { getPlatformProxy } from 'wrangler'

import { indexAllRegistries } from '../src/lib/indexer.js'

interface IndexerOptions {
  /**
   * Custom archive URL for testing
   * @default Uses the default enhansome-registry archive URL
   */
  archiveUrl?: string

  /**
   * Trigger source
   * @default 'manual'
   */
  triggerSource?: 'manual' | 'scheduled'

  /**
   * Wrangler environment to use (e.g., 'github')
   * Uses default bindings if not specified
   */
  wranglerEnv?: string
}

/**
 * Run the complete indexing process
 */
export async function indexRegistry(
  options: IndexerOptions = {},
): Promise<void> {
  const { archiveUrl, triggerSource = 'manual', wranglerEnv } = options

  console.log(`Starting indexing workflow (source: ${triggerSource})`)
  if (wranglerEnv) {
    console.log(`Using wrangler environment: ${wranglerEnv}`)
  }

  // Get D1 binding via wrangler's platform proxy
  const proxy = await getPlatformProxy({
    configPath: './wrangler.jsonc',
    ...(wranglerEnv && { environment: wranglerEnv }),
  })
  const db = proxy.env.DB as D1Database

  // Debug: Verify we're connected to remote DB with tables
  const { results: tables } = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all<{ name: string }>()
  console.log(
    'Connected to D1. Tables:',
    tables.map(t => t.name),
  )

  try {
    const result = await indexAllRegistries(db, archiveUrl)

    console.log(
      `\nIndexing complete: ${result.success} succeeded, ${result.failed} failed`,
    )

    if (result.errors.length > 0) {
      console.error('\nErrors encountered:')
      for (const error of result.errors) {
        console.error(`  - ${error}`)
      }
    }
  } finally {
    // Clean up the proxy
    await proxy.dispose()
  }
}

// CLI entry point

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const archiveUrl = process.env.ARCHIVE_URL || undefined
  const triggerSource = process.env.TRIGGER_SOURCE as
    | 'manual'
    | 'scheduled'
    | undefined
  const wranglerEnv = process.env.WRANGLER_ENV || undefined

  indexRegistry({
    archiveUrl,
    triggerSource,
    wranglerEnv,
  })
    .then(() => {
      // eslint-disable-next-line n/no-process-exit
      process.exit(0)
    })
    .catch((error: unknown) => {
      console.error(error)
      // eslint-disable-next-line n/no-process-exit
      process.exit(1)
    })
}
