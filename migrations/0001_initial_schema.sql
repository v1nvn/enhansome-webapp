-- Migration: Initial schema for Enhansome Registry
-- Created: 2025-10-11

-- Registry metadata table
CREATE TABLE registry_metadata (
  registry_name TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  last_updated TEXT NOT NULL,
  source_repository TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_stars INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registry items table
CREATE TABLE registry_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  repo_owner TEXT,
  repo_name TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  language TEXT,
  last_commit TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name) ON DELETE CASCADE
);

-- Sync log table
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('success', 'error')),
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_registry_items_registry_name ON registry_items(registry_name);
CREATE INDEX idx_registry_items_category ON registry_items(category);
CREATE INDEX idx_registry_items_stars ON registry_items(stars DESC);
CREATE INDEX idx_registry_items_language ON registry_items(language);
CREATE INDEX idx_registry_items_archived ON registry_items(archived);
CREATE INDEX idx_registry_items_repo ON registry_items(repo_owner, repo_name);
CREATE INDEX idx_sync_log_registry_name ON sync_log(registry_name);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at DESC);
