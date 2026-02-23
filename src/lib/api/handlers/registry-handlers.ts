/**
 * Registry API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import { aggregateCategoriesByRegistry } from '../../db/queries/aggregator'
import {
  getFeaturedRegistries,
  getRegistryData,
  getRegistryDetail,
  getRegistryMetadata,
  getTrendingRegistries,
} from '../../db/repositories/registry-repository'
import { getAllRegistryStatsBatched } from '../../db/repositories/stats-repository'

import type { Kysely } from 'kysely'

export type RegistryDetail = NonNullable<
  Awaited<ReturnType<typeof getRegistryDetail>>
>

export interface RegistryMetadataWithStats {
  description: string
  name: string
  source_repository: string
  stats: {
    categories?: string[]
    languages: string[]
    latestUpdate: string
    totalRepos: number
    totalStars: number
  }
  title: string
}

export interface TrendingRegistry {
  description: string
  name: string
  starsGrowth: number
  title: string
  total_items: number
  total_stars: number
}

export async function fetchMetadataHandler(
  db: Kysely<Database>,
): Promise<RegistryMetadataWithStats[]> {
  const metadataList = await getRegistryMetadata(db as any)

  const sortedCategoryMap = await aggregateCategoriesByRegistry(db as any)
  const sortedCategoryArray = new Map<string, string[]>()
  for (const [key, set] of sortedCategoryMap.entries()) {
    sortedCategoryArray.set(key, Array.from(set).sort())
  }

  const allStats = await getAllRegistryStatsBatched(db as any)

  return metadataList.map(metadata => {
    const stats = allStats.get(metadata.registry_name)
    return {
      description: metadata.description,
      name: metadata.registry_name,
      source_repository: metadata.source_repository,
      stats: {
        categories: sortedCategoryArray.get(metadata.registry_name) ?? [],
        languages: stats?.languages ?? [],
        latestUpdate: stats?.latestUpdate ?? '',
        totalRepos: stats?.totalRepos ?? 0,
        totalStars: stats?.totalStars ?? 0,
      },
      title: metadata.title,
    }
  })
}

export async function fetchRegistryDetailHandler(
  db: Kysely<Database>,
  data: { name: string },
) {
  return getRegistryDetail(db as any, data.name)
}

export async function fetchTrendingRegistriesHandler(
  db: Kysely<Database>,
  limit = 12,
): Promise<TrendingRegistry[]> {
  return getTrendingRegistries(db as any, limit)
}

export async function getFeaturedRegistriesHandler(db: Kysely<Database>) {
  return getFeaturedRegistries(db as any)
}

export async function getRegistryDataHandler(
  db: Kysely<Database>,
  registryName: string,
) {
  return getRegistryData(db as any, registryName)
}
