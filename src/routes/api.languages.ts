import { createFileRoute } from '@tanstack/react-router'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import { createKysely, getLanguages } from '@/lib/db'

export const Route = createFileRoute('/api/languages')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = createKysely(env.DB)

          // Check if registry filter is provided
          const url = new URL(request.url)
          const registryName = url.searchParams.get('registry') || undefined

          const languages = await getLanguages(db, registryName)

          return new Response(JSON.stringify(languages), {
            headers: {
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
              'Content-Type': 'application/json',
            },
            status: 200,
          })
        } catch (error) {
          console.error('Languages API error:', error)
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
