/**
 * Repository repository
 * Handles individual repository queries
 */

import type { Database } from '@/types/database'

import type { Kysely } from 'kysely'

export async function getRepoDetail(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<null | {
  categories: string[]
  description: null | string
  language: null | string
  lastCommit: null | string
  name: string
  owner: string
  registries: {
    name: string
  }[]
  registryName: string
  relatedRepos: {
    categories: string[]
    name: string
    owner: null | string
    stars: number
  }[]
  stars: number
}> {
  const result = await db
    .selectFrom('repositories')
    .innerJoin(
      'registry_repositories',
      'registry_repositories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .innerJoin(
      'registry_metadata',
      'registry_metadata.registry_name',
      'registry_repositories.registry_name',
    )
    .select([
      'categories.name as category_name',
      'repositories.id',
      'repositories.owner',
      'repositories.name',
      'repositories.description',
      'repositories.language',
      'repositories.last_commit',
      'repositories.stars',
      'registry_repositories.registry_name',
    ])
    .where('repositories.owner', '=', owner)
    .where('repositories.name', '=', name)
    .execute()

  if (result.length === 0) {
    return null
  }

  const repoRow = result[0]
  const repo = {
    id: repoRow.id,
    owner: repoRow.owner,
    name: repoRow.name,
    description: repoRow.description,
    language: repoRow.language,
    last_commit: repoRow.last_commit,
    stars: repoRow.stars,
  }

  const registryMap = new Map<
    string,
    {
      categories: Set<string>
      registryName: string
    }
  >()

  for (const row of result) {
    if (!registryMap.has(row.registry_name)) {
      registryMap.set(row.registry_name, {
        categories: new Set(),
        registryName: row.registry_name,
      })
    }
    registryMap.get(row.registry_name)?.categories.add(row.category_name)
  }

  const registries = Array.from(registryMap.values()).map(r => ({
    name: r.registryName,
  }))

  const primaryRegistryName = result[0].registry_name
  const primaryCategories = Array.from(
    registryMap.get(primaryRegistryName)?.categories ?? [],
  )

  const relatedReposResult = await db
    .selectFrom('registry_repositories')
    .innerJoin(
      'repositories',
      'repositories.id',
      'registry_repositories.repository_id',
    )
    .innerJoin(
      'registry_repository_categories',
      'registry_repository_categories.repository_id',
      'repositories.id',
    )
    .innerJoin(
      'categories',
      'categories.id',
      'registry_repository_categories.category_id',
    )
    .select([
      'categories.name as category_name',
      'repositories.owner',
      'repositories.name',
      'repositories.stars',
    ])
    .where('registry_repositories.registry_name', '=', primaryRegistryName)
    .where('repositories.id', '!=', repo.id)
    .where('repositories.archived', '=', 0)
    .orderBy('repositories.stars', 'desc')
    .limit(20)
    .execute()

  const relatedRepoMap = new Map<
    string,
    { categories: Set<string>; name: string; owner: string; stars: number }
  >()
  for (const row of relatedReposResult) {
    const key = `${row.owner}/${row.name}`
    if (!relatedRepoMap.has(key)) {
      relatedRepoMap.set(key, {
        categories: new Set(),
        name: row.name,
        owner: row.owner,
        stars: row.stars,
      })
    }
    relatedRepoMap.get(key)?.categories.add(row.category_name)
  }

  const relatedRepos = Array.from(relatedRepoMap.values())
    .slice(0, 6)
    .map(r => ({
      categories: Array.from(r.categories).sort(),
      name: r.name,
      owner: r.owner,
      stars: r.stars,
    }))

  return {
    categories: primaryCategories.sort(),
    description: repo.description,
    language: repo.language,
    lastCommit: repo.last_commit,
    name: repo.name,
    owner: repo.owner,
    registryName: primaryRegistryName,
    stars: repo.stars,
    registries,
    relatedRepos,
  }
}
