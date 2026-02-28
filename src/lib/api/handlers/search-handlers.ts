/**
 * Search API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import {
  getFilterOptions,
  searchRepos,
} from '../../db/repositories/search-repository'

export type { FilterOptions } from '../../db/repositories/search-repository'

import type { Kysely } from 'kysely'

export interface SearchParamsInternal {
  archived?: boolean
  categoryName?: string
  cursor?: number
  dateFrom?: string
  language?: string
  limit?: number
  minStars?: number
  q?: string
  registryName?: string
  sortBy?: 'name' | 'quality' | 'stars' | 'updated'
}

export async function fetchFilterOptionsHandler(
  db: Kysely<Database>,
  options?: { categoryName?: string; language?: string; registryName?: string },
) {
  return getFilterOptions(db as any, options ?? {})
}

export async function searchReposHandler(
  db: Kysely<Database>,
  data: SearchParamsInternal,
) {
  return searchRepos(db as any, {
    archived: data.archived,
    categoryName: data.categoryName,
    cursor: data.cursor,
    language: data.language,
    limit: data.limit ?? 20,
    minStars: data.minStars,
    q: data.q,
    registryName: data.registryName,
    sortBy: data.sortBy ?? 'quality',
  })
}
