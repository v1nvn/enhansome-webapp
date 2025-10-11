import { createFileRoute } from '@tanstack/react-router'

import type { RegistryData, RegistryFile } from '@/types/registry'

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/v1nvn/enhansome-registry/main'

interface CacheEntry {
  data: RegistryFile[]
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

async function fetchRegistryData(): Promise<RegistryFile[]> {
  const now = Date.now()

  // Return cached data if valid
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  // Get list of registry files from GitHub
  const registryFiles = await getRegistryFiles()

  // Fetch all registry files in parallel
  const results = await Promise.all(
    registryFiles.map(async filename => {
      const url = `${GITHUB_RAW_BASE}/data/${filename}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.statusText}`)
      }
      const data: RegistryData = await response.json()
      return {
        data,
        name: filename.replace('v1nvn_enhansome-', '').replace('.json', ''),
      }
    }),
  )

  // Update cache
  cache = {
    data: results,
    timestamp: now,
  }

  return results
}

async function getRegistryFiles(): Promise<string[]> {
  const response = await fetch(
    'https://api.github.com/repos/v1nvn/enhansome-registry/contents/data',
    {
      headers: {
        'User-Agent': 'enhansome-webapp',
      },
    },
  )

  if (!response.ok) {
    console.log(await response.text())
    throw new Error(`Failed to list files: ${response.statusText}`)
  }

  const files = (await response.json()) as {
    name: string
    type: string
  }[]

  return files
    .filter(file => file.type === 'file' && file.name.endsWith('.json'))
    .map(file => file.name)
}

export const Route = createFileRoute('/api/registry')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await fetchRegistryData()
          return new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          })
        } catch (error) {
          console.error('Registry API error:', error)
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
              },
              status: 500,
            },
          )
        }
      },
    },
  },
})
