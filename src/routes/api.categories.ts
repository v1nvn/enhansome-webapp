import { createFileRoute } from '@tanstack/react-router'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import { createKysely } from '@/lib/db'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = createKysely(env.DB)
          const url = new URL(request.url)

          // Check if registry filter is provided
          const registryName = url.searchParams.get('registry') || undefined

          // Get categories with counts
          let query = db
            .selectFrom('registry_items')
            .select([
              'registry_name',
              'category',
              db.fn.count<number>('id').as('count'),
            ])
            .groupBy(['registry_name', 'category'])
            .orderBy('category', 'asc')

          if (registryName) {
            query = query.where('registry_name', '=', registryName)
          }

          const results = await query.execute()

          // Transform to a more usable format
          const categories = results.map(row => ({
            category: row.category,
            count: row.count,
            key: `${row.registry_name}::${row.category}`,
            registry: row.registry_name,
          }))

          return new Response(JSON.stringify(categories), {
            headers: {
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
              'Content-Type': 'application/json',
            },
            status: 200,
          })
        } catch (error) {
          console.error('Categories API error:', error)
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            },
          )
        }
      },
    },
  },
})
