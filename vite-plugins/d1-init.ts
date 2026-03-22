/**
 * Vite plugin for D1 database initialization in development
 * Runs migrations and seeds data before dev server accepts requests
 */

import type { Plugin } from 'vite'
import { exec } from 'child_process'
import { promisify } from 'util'

import { indexRegistry } from '../scripts/index-registry'

const execAsync = promisify(exec)

export function d1InitPlugin() {
  return {
    name: 'vite-plugin-d1-init',

    // Apply only in development
    apply: 'serve',

    async configureServer() {
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

        // 2. Run indexing (only if database is empty)
        console.log('  📊 Running indexing...')
        await indexRegistry({ triggerSource: 'manual', onlyIndexEmpty: true })

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
      }
    },
  } as Plugin
}
