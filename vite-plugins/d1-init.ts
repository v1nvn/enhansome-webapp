/**
 * Vite plugin for D1 database initialization in development
 * Runs migrations and seeds data before dev server accepts requests
 */

import type { Plugin } from 'vite'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getPlatformProxy } from 'wrangler'
import { D1Database } from '@cloudflare/workers-types/experimental'

const execAsync = promisify(exec)

export function d1InitPlugin() {
  let platformProxy: Awaited<ReturnType<typeof getPlatformProxy>> | null = null

  return {
    name: 'vite-plugin-d1-init',

    // Apply only in development
    apply: 'serve',

    async configureServer(server) {
      console.log('🔧 Initializing D1 database for development...')

      try {
        // 1. Run migrations via wrangler CLI
        console.log('  📦 Running migrations...')
        const { stdout, stderr } = await execAsync(
          'npx wrangler d1 migrations apply enhansome-registry --local',
        )

        if (stderr && !stderr.includes('Migrations to be applied')) {
          console.error('  ⚠️  Migration warnings:', stderr)
        }

        if (stdout) {
          console.log(stdout.trim())
        }

        console.log('  ✓ Migrations applied')

        // 2. Get platform proxy to access D1 binding
        console.log('  🔌 Connecting to D1...')
        platformProxy = await getPlatformProxy({
          configPath: './wrangler.jsonc',
        })

        // 3. Access the D1 database binding
        const db = (platformProxy.env as {DB: D1Database}).DB as D1Database

        if (!db) {
          throw new Error('DB binding not found in environment')
        }

        console.log('  ✓ Connected to D1')

        // 4. Check if database needs seeding
        console.log('  📊 Checking database status...')
        const result = await db
          .prepare('SELECT COUNT(*) as count FROM registry_metadata')
          .first<{ count: number }>()

        const isEmpty = !result || result.count === 0

        if (isEmpty) {
          console.log('  📭 Database is empty, seeding data...')

          // Import workflow step functions dynamically
          const {
            checkIsIndexingRunning,
            createWorkflowHistoryEntry,
            fetchAndCollectStep,
            finalizeStep,
            rebuildFacetsStep,
            rebuildFtsStep,
            setIndexingRunning,
            writeAssociationsStep,
            writeCategoriesStep,
            writeRepositoriesStep,
            writeTagsAndMetadataStep,
          } = await import('../src/lib/indexer')

          // Check if already running
          if (await checkIsIndexingRunning(db)) {
            console.log('  ⚠️  Indexing already in progress, skipping...')
          } else {
            // Create history entry
            const historyId = await createWorkflowHistoryEntry(
              db,
              'manual',
              'vite-plugin',
            )
            await setIndexingRunning(db, historyId)

            try {
              // Step 1: Fetch and collect
              const fetchResult = await fetchAndCollectStep(db, {
                historyId,
                triggerSource: 'manual',
                createdBy: 'vite-plugin',
              })

              // Step 2-5: Write data
              await writeRepositoriesStep(db, historyId, fetchResult.collected)
              await writeTagsAndMetadataStep(db, historyId, fetchResult.collected)
              await writeAssociationsStep(db, historyId, fetchResult.collected)
              await writeCategoriesStep(db, historyId, fetchResult.collected)

              // Step 6-7: Rebuild indexes
              await rebuildFacetsStep(db, historyId)
              await rebuildFtsStep(db, historyId)

              // Step 8: Finalize
              await finalizeStep(db, historyId, {
                errors: fetchResult.errors,
                failed: fetchResult.failed,
                success: fetchResult.success,
              })

              console.log(
                `  ✓ Indexed ${fetchResult.success} registries (${fetchResult.failed} failed)`,
              )

              if (fetchResult.errors.length > 0) {
                console.error('  ⚠️  Indexing errors:')
                fetchResult.errors.forEach(error =>
                  console.error(`    - ${error}`),
                )
              }
            } catch (error) {
              console.error('  ❌ Indexing failed:', error)
              throw error
            }
          }
        } else {
          console.log(`  ✓ Database already has data (${result.count} registries)`)
        }

        console.log('🎉 D1 initialization complete!\n')
      } catch (error) {
        console.error('❌ D1 initialization failed:', error)
        console.error(
          '   The dev server will start, but the database may not be ready.',
        )
        console.error(
          '   Try running: npx wrangler d1 migrations apply enhansome-registry --local\n',
        )
        // Don't throw - allow dev server to start
      } finally {
        // Clean up platform proxy
        if (platformProxy) {
          await platformProxy.dispose()
          platformProxy = null
        }
      }
    },
  } as Plugin
}
