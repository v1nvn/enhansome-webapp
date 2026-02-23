/**
 * Reusable filter builders for Kysely queries
 * Eliminates code duplication for common WHERE clauses
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { Expression, Generated } from 'kysely'

export interface RepositoryFilters {
  archived?: boolean
  language?: string
  minStars?: number
  registryName?: string
  searchQuery?: string
}

export interface RepositoryTables {
  r: {
    archived: Generated<number>
    description: Generated<null | string>
    id: Generated<number>
    language: Generated<null | string>
    last_commit: Generated<null | string>
    name: string
    owner: string
    stars: Generated<number>
  }
  rr: {
    registry_name: string
    repository_id: number
    title: string
  }
}

/**
 * Apply common repository filters to a query
 * Assumes query has 'repositories as r' and optionally 'registry_repositories as rr'
 */
export function applyRepositoryFilters<
  QB extends {
    where: (expression: Expression<unknown>) => QB
  },
>(query: QB, filters: RepositoryFilters, { hasRegistryTable = true } = {}): QB {
  let result = query

  if (filters.registryName && hasRegistryTable) {
    // @ts-expect-error - dynamic where
    result = result.where('rr.registry_name', '=', filters.registryName)
  }

  if (filters.language) {
    // @ts-expect-error - dynamic where
    result = result.where('r.language', '=', filters.language)
  }

  if (filters.archived !== undefined) {
    // @ts-expect-error - dynamic where
    result = result.where('r.archived', '=', filters.archived ? 1 : 0)
  }

  if (filters.minStars) {
    // @ts-expect-error - dynamic where
    result = result.where('r.stars', '>=', filters.minStars)
  }

  if (filters.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`
    // @ts-expect-error - dynamic where with or

    result = result.where((eb: any) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eb.or([
        eb('r.name', 'like', searchTerm),
        eb('r.owner', 'like', searchTerm),
        eb('r.description', 'like', searchTerm),
      ]),
    )
  }

  return result
}
