import { createFileRoute } from '@tanstack/react-router'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import { createKysely, searchRegistryItems } from '@/lib/db'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = createKysely(env.DB)
          const url = new URL(request.url)

          // Extract search parameters
          const q = url.searchParams.get('q') || undefined
          const registryName = url.searchParams.get('registry') || undefined
          const language = url.searchParams.get('language') || undefined
          const archivedParam = url.searchParams.get('archived')
          const archived =
            archivedParam === 'true'
              ? true
              : archivedParam === 'false'
                ? false
                : undefined
          const minStarsParam = url.searchParams.get('minStars')
          const minStars = minStarsParam
            ? parseInt(minStarsParam, 10)
            : undefined
          const sortByParam = url.searchParams.get('sortBy')
          const sortBy =
            sortByParam === 'name' ||
            sortByParam === 'stars' ||
            sortByParam === 'updated'
              ? sortByParam
              : 'stars'
          const limitParam = url.searchParams.get('limit')
          const limit = limitParam ? parseInt(limitParam, 10) : 100
          const offsetParam = url.searchParams.get('offset')
          const offset = offsetParam ? parseInt(offsetParam, 10) : 0

          // Execute search
          const results = await searchRegistryItems(db, {
            archived,
            language,
            limit,
            minStars,
            offset,
            q,
            registryName,
            sortBy,
          })

          return new Response(JSON.stringify(results), {
            headers: {
              'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
              'Content-Type': 'application/json',
            },
            status: 200,
          })
        } catch (error) {
          console.error('Search API error:', error)
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
