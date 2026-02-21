-- Migration: Initial schema for Enhansome Registry with deduplicated repositories
-- Created: 2025-10-11
-- Updated: 2025-02-21 - Repository deduplication with many-to-many model

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

-- Canonical repositories table (one unique repo per owner/name)
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  language TEXT,
  last_commit TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner, name)
);

-- Junction table: many-to-many relationship between registries and repositories
CREATE TABLE registry_repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL,
  repository_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',  -- JSON array of category strings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name) ON DELETE CASCADE,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  UNIQUE(registry_name, repository_id)
);

-- Featured registries table
CREATE TABLE registry_featured (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL UNIQUE,
  featured INTEGER NOT NULL DEFAULT 1,
  featured_order INTEGER,
  editorial_badge TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name)
);

-- Indexing history table
CREATE TABLE indexing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_source TEXT NOT NULL CHECK(trigger_source IN ('manual', 'scheduled')),
  status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_registries INTEGER,
  processed_registries INTEGER NOT NULL DEFAULT 0,
  current_registry TEXT,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  errors TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexing latest status table (single-row)
CREATE TABLE indexing_latest (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  history_id INTEGER,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (history_id) REFERENCES indexing_history(id)
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

-- Initialize latest status
INSERT OR IGNORE INTO indexing_latest (id, history_id, status, updated_at)
VALUES (1, NULL, 'idle', datetime('now'));

-- Indexes for performance - repositories
CREATE INDEX idx_repositories_stars ON repositories(stars DESC);
CREATE INDEX idx_repositories_language ON repositories(language);
CREATE INDEX idx_repositories_archived ON repositories(archived);
CREATE INDEX idx_repositories_search ON repositories(owner, name, description);

-- Indexes for performance - registry_repositories
CREATE INDEX idx_registry_repositories_registry ON registry_repositories(registry_name);
CREATE INDEX idx_registry_repositories_repository ON registry_repositories(repository_id);

-- Indexes for performance - registry_featured
CREATE INDEX idx_registry_featured_order ON registry_featured(featured, featured_order);

-- Indexes for performance - indexing_history
CREATE INDEX idx_indexing_history_started ON indexing_history(started_at DESC);

-- Indexes for performance - sync_log
CREATE INDEX idx_sync_log_registry_name ON sync_log(registry_name);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at DESC);

-- Indexes for performance - registry_metadata
CREATE INDEX idx_registry_metadata_velocity ON registry_metadata(total_stars DESC, last_updated DESC);
