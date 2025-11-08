import path from 'node:path'
import {
  defineWorkersProject,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersProject(async () => {
  // Read D1 migrations for test setup
  const migrationsPath = path.join(__dirname, 'migrations')
  const migrations = await readD1Migrations(migrationsPath)

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      setupFiles: ['./tests/helpers/apply-migrations.ts'],
      testTimeout: 30000,
      // Exclude component tests - they use vitest.ui.config.ts with jsdom
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'tests/unit/components/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.test.ts',
          '**/*.spec.ts',
          'vitest.config.ts',
        ],
      },
      poolOptions: {
        workers: {
          wrangler: {
            configPath: './wrangler.json',
          },
          miniflare: {
            d1Databases: ['DB'],
            bindings: { TEST_MIGRATIONS: migrations },
          },
          // Enable isolated storage (default, but explicit for clarity)
          isolatedStorage: true,
        },
      },
    },
  }
})
