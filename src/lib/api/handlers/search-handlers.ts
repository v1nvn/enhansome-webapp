/**
 * Search API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import type { FilterPreset } from '../../utils/filters'

import {
  getUseCaseCategoryCounts,
  getUseCaseCategoryItems,
  searchRepos,
} from '../../db/repositories/search-repository'
import { getAllUseCaseCategories } from '../../utils/categories'
import { presetToSearchParams } from '../../utils/filters'

import type { Kysely } from 'kysely'

export interface SearchParamsInternal {
  archived?: boolean
  cursor?: number
  dateFrom?: string
  language?: string
  limit?: number
  minStars?: number
  preset?: FilterPreset
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
}

export interface UseCaseCategoryWithData {
  count: number
  description: string
  icon: string
  id: string
  title: string
}

export async function fetchUseCaseCategoriesHandler(
  db: Kysely<Database>,
): Promise<UseCaseCategoryWithData[]> {
  const counts = await getUseCaseCategoryCounts(db as any)
  const allCategories = getAllUseCaseCategories()

  const countMap = new Map(counts.map(c => [c.categoryId, c.count]))

  return allCategories
    .map(cat => ({
      ...cat,
      count: countMap.get(cat.id) || 0,
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count)
}

export async function fetchUseCaseCategoryItemsHandler(
  db: Kysely<Database>,
  categoryId: string,
  options?: {
    framework?: string
    limit?: number
    offset?: number
  },
) {
  return getUseCaseCategoryItems(db as any, categoryId, options)
}

export async function searchReposHandler(
  db: Kysely<Database>,
  data: SearchParamsInternal,
) {
  const presetParams = presetToSearchParams(data.preset)

  return searchRepos(db as any, {
    archived: data.archived ?? presetParams.archived,
    cursor: data.cursor,
    language: data.language,
    limit: data.limit ?? 20,
    minStars: data.minStars ?? presetParams.minStars,
    q: data.q,
    registryName: data.registryName,
    sortBy: data.sortBy ?? 'quality',
  })
}
