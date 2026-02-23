/**
 * Common JOIN patterns for repository queries
 * Provides reusable join builders for frequently used table combinations
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Add standard repository-registry-category joins to a query
 * Returns a query with r, rr, rrc, c aliases available
 * Note: Uses 'any' type return because Kysely can't infer complex multi-join types
 */
export function joinRepositoryWithRegistriesAndCategories(query: any): any {
  return query
    .innerJoin('registry_repositories as rr', (join: any) =>
      join('rr.repository_id', '=', 'r.id'),
    )
    .innerJoin('registry_repository_categories as rrc', (join: any) =>
      join('rrc.repository_id', '=', 'r.id'),
    )
    .innerJoin('categories as c', (join: any) =>
      join('c.id', '=', 'rrc.category_id'),
    )
}

/**
 * Select category fields for repository queries
 */
export function selectCategoryFields(qb: any): any {
  return qb.select(['c.name as category_name'])
}

/**
 * Select registry fields for repository queries
 */
export function selectRegistryFields(qb: any): any {
  return qb.select(['rr.title', 'rr.registry_name'])
}

/**
 * Select standard fields for repository queries
 */
export function selectRepositoryFields(qb: any): any {
  return qb.select([
    'r.id',
    'r.owner',
    'r.name',
    'r.description',
    'r.stars',
    'r.language',
    'r.last_commit',
    'r.archived',
  ])
}
