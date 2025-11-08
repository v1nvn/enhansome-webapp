/**
 * Kysely database schema types for Enhansome Registry D1 database
 * These types match the schema defined in enhansome-registry/migrations
 */

import type { Generated } from 'kysely'

/**
 * Database schema interface
 */
export interface Database {
  registry_items: RegistryItemsTable
  registry_metadata: RegistryMetadataTable
  sync_log: SyncLogTable
}

/**
 * Registry items table schema
 */
export interface RegistryItemsTable {
  archived: number // SQLite uses INTEGER for boolean (0 or 1)
  category: string
  created_at: Generated<string>
  description: null | string
  id: Generated<number>
  language: null | string
  last_commit: null | string
  registry_name: string
  repo_name: null | string
  repo_owner: null | string
  stars: number
  title: string
  updated_at: Generated<string>
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
