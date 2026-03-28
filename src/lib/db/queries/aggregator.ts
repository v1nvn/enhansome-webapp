import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

/**
 * Aggregate categories by registry_name from junction table
 */
export async function aggregateCategoriesByRegistry(
  db: Kysely<Database>,
): Promise<Map<string, Set<string>>> {
  const categoryRows = await db
    .selectFrom('registry_repository_categories')
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select(['registry_repository_categories.registry_name', 'categories.name'])
    .execute()

  const categoryMap = new Map<string, Set<string>>()
  for (const row of categoryRows) {
    if (!categoryMap.has(row.registry_name)) {
      categoryMap.set(row.registry_name, new Set<string>())
    }
    const registryCategories = categoryMap.get(row.registry_name)
    if (registryCategories) {
      registryCategories.add(row.name)
    }
  }

  return categoryMap
}
