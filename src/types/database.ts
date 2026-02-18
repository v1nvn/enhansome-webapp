/**
 * Kysely database schema types for Enhansome Registry D1 database
 * These types match the schema defined in enhansome-registry/migrations
 */

import type { Generated } from 'kysely'

/**
 * Database schema interface
 */
export interface Database {
  indexing_history: IndexingHistoryTable
  indexing_latest: IndexingLatestTable
  registry_featured: RegistryFeaturedTable
  registry_items: RegistryItemsTable
  registry_metadata: RegistryMetadataTable
  sync_log: SyncLogTable
}

/**
 * Indexing history table schema
 */
export interface IndexingHistoryTable {
  completed_at: null | string
  created_by: null | string
  current_registry: null | string
  error_message: null | string
  errors: null | string
  failed_count: number
  id: Generated<number>
  processed_registries: number
  started_at: string
  status: 'completed' | 'failed' | 'running'
  success_count: number
  total_registries: null | number
  trigger_source: 'manual' | 'scheduled'
}

/**
 * Indexing latest status table schema
 */
export interface IndexingLatestTable {
  history_id: null | number
  id: 1 // Single-row table with id = 1
  status: 'completed' | 'failed' | 'idle' | 'running'
  updated_at: string
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
