import { createFileRoute } from '@tanstack/react-router'
// eslint-disable-next-line import-x/no-unresolved
import { env } from 'cloudflare:workers'

import { createKysely, getRegistryMetadata, getRegistryStats } from '@/lib/db'

export const Route = createFileRoute('/api/metadata')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = createKysely(env.DB)

          // Get all registry metadata
          const metadataList = await getRegistryMetadata(db)

          // Get stats for each registry
          const registriesWithStats = await Promise.all(
            metadataList.map(async metadata => {
              const stats = await getRegistryStats(db, metadata.registry_name)
              return {
                description: metadata.description,
                name: metadata.registry_name,
                source_repository: metadata.source_repository,
                stats,
                title: metadata.title,
              }
            }),
          )

          return new Response(JSON.stringify(registriesWithStats), {
            headers: {
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
              'Content-Type': 'application/json',
            },
            status: 200,
          })
        } catch (error) {
          console.error('Metadata API error:', error)
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
