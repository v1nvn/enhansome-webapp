/**
 * Kysely database schema types for Enhansome Registry D1 database
 * These types match the schema defined in enhansome-registry/migrations
 */

import type { Generated } from 'kysely'

/**
 * Categories table schema (canonical categories)
 */
export interface CategoriesTable {
  created_at: Generated<string>
  id: Generated<number>
  name: string
  slug: string
}

/**
 * Database schema interface
 */
export interface Database {
  categories: CategoriesTable
  registry_featured: RegistryFeaturedTable
  registry_metadata: RegistryMetadataTable
  registry_repositories: RegistryRepositoriesTable
  registry_repository_categories: RegistryRepositoryCategoriesTable
  repo_tags: RepoTagsTable
  repositories: RepositoriesTable
  repositories_fts: RepositoriesFtsTable
  repository_facets: RepositoryFacetsTable
  sync_log: SyncLogTable
  tags: TagsTable
}

/**
 * Registry featured table schema
 */
export interface RegistryFeaturedTable {
  created_at: Generated<string>
  editorial_badge: null | string
  featured: number // SQLite uses INTEGER for boolean (0 or 1)
  featured_order: null | number
  id: Generated<number>
  registry_name: string
}

/**
 * Registry metadata table schema
 */
export interface RegistryMetadataTable {
  created_at: Generated<string>
  description: string
  last_updated: string
  registry_name: string
  source_repository: string
  title: string
  total_items: number
  total_stars: number
  updated_at: Generated<string>
}

/**
 * Registry repositories junction table schema
 */
export interface RegistryRepositoriesTable {
  created_at: Generated<string>
  id: Generated<number>
  registry_name: string
  repository_id: number
  title: string
}

/**
 * Registry repository categories junction table schema (many-to-many)
 */
export interface RegistryRepositoryCategoriesTable {
  category_id: number
  registry_name: string
  repository_id: number
}

/**
 * FTS5 virtual table for full-text search
 * Note: FTS5 tables don't have rowid in the traditional sense - they use docid
 */
export interface RepositoriesFtsTable {
  archived: number
  category_names: string
  description: string
  language: string
  last_commit: string
  name: string
  owner: string
  registry_names: string
  stars: number
  tag_names: string
}

/**
 * Repositories table schema (canonical repositories)
 */
export interface RepositoriesTable {
  archived: number
  created_at: Generated<string>
  description: null | string
  id: Generated<number>
  language: null | string
  last_commit: null | string
  name: string
  owner: string
  stars: number
  updated_at: Generated<string>
}

/**
 * Repository facets denormalized table schema (rebuilt at ingestion time)
 */
export interface RepositoryFacetsTable {
  category_name: null | string
  language: null | string
  registry_name: string
  repository_id: number
  tag_name: string
}

/**
 * Repo tags junction table schema (per registry context)
 * category_id captures which frozen category the originating heading mapped to
 */
export interface RepoTagsTable {
  category_id: null | number
  registry_name: string
  repository_id: number
  tag_id: number
}

/**
 * Sync log table schema
 */
export interface SyncLogTable {
  created_at: Generated<string>
  error_message: null | string
  id: Generated<number>
  items_synced: null | number
  registry_name: string
  status: 'error' | 'success'
}

/**
 * Tags table schema (canonical tag entries)
 */
export interface TagsTable {
  created_at: Generated<string>
  id: Generated<number>
  name: string
  slug: string
}
