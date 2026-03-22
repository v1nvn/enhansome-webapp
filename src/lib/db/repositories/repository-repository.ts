/**
 * Repository repository
 * Handles individual repository queries
 * Uses base tables for single-item lookup, new FTS for related repos
 */

import { sql } from 'kysely'

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
  tags: string[]
}> {
  // Get base repository data
  const repoResult = await sql<{
    archived: number
    description: null | string
    id: number
    language: null | string
    last_commit: null | string
    name: string
    owner: string
    stars: number
  }>`
    SELECT id, owner, name, description, language, last_commit, stars, archived
    FROM repositories
    WHERE owner = ${sql.raw(`'${owner.replace(/'/g, "''")}'`)}
      AND name = ${sql.raw(`'${name.replace(/'/g, "''")}'`)}
  `.execute(db)

  if (repoResult.rows.length === 0) {
    return null
  }

  const repoRow = repoResult.rows[0]
  const repoId = repoRow.id

  // Get categories from base table (registry_repository_categories)
  const categoryResult = await sql<{
    name: string
  }>`
    SELECT DISTINCT c.name
    FROM registry_repository_categories rrc
    JOIN categories c ON c.id = rrc.category_id
    WHERE rrc.repository_id = ${repoId}
    ORDER BY c.name
  `.execute(db)

  const categories = categoryResult.rows.map(r => r.name)

  // Get tags from base table (repo_tags)
  const tagResult = await sql<{
    name: string
  }>`
    SELECT DISTINCT t.name
    FROM repo_tags rt
    JOIN tags t ON t.id = rt.tag_id
    WHERE rt.repository_id = ${repoId}
    ORDER BY t.name
  `.execute(db)

  const tags = tagResult.rows.map(r => r.name)

  // Get all registries for this repo from registry_repositories
  const registryResult = await sql<{
    registry_name: string
  }>`
    SELECT registry_name
    FROM registry_repositories
    WHERE repository_id = ${repoId}
  `.execute(db)

  const registries = registryResult.rows.map(r => ({ name: r.registry_name }))
  const primaryRegistryName = registries[0]?.name || ''

  // Get related repos using new FTS with registry filter
  let relatedRepos: {
    categories: string[]
    name: string
    owner: null | string
    stars: number
  }[] = []

  if (primaryRegistryName) {
    const escapedRegistry = primaryRegistryName.replace(/'/g, "''")
    const relatedReposResult = await sql<{
      categories: string
      name: string
      owner: string
      stars: number
    }>`
      SELECT
        owner,
        name,
        stars,
        GROUP_CONCAT(DISTINCT category_name) as categories
      FROM registry_repositories_fts
      WHERE registry_name = ${sql.raw(`'${escapedRegistry}'`)}
        AND archived = 0
        AND repository_id != ${repoId}
      GROUP BY repository_id
      ORDER BY stars DESC
      LIMIT 6
    `.execute(db)

    relatedRepos = relatedReposResult.rows.map(r => ({
      categories: r.categories ? r.categories.split(',').sort() : [],
      name: r.name,
      owner: r.owner,
      stars: r.stars,
    }))
  }

  return {
    categories: categories.sort(),
    description: repoRow.description,
    language: repoRow.language,
    lastCommit: repoRow.last_commit,
    name: repoRow.name,
    owner: repoRow.owner,
    registryName: primaryRegistryName,
    stars: repoRow.stars,
    registries,
    relatedRepos,
    tags,
  }
}
