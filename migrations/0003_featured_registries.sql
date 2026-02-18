-- Migration: Featured registries for editorial curation
-- Created: 2025-02-18

-- Featured registries table
CREATE TABLE IF NOT EXISTS registry_featured (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL UNIQUE,
  featured INTEGER DEFAULT 1,
  featured_order INTEGER,
  editorial_badge TEXT, -- 'editors-choice', 'trending', 'new'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name)
);

-- Index for querying featured registries in order
CREATE INDEX IF NOT EXISTS idx_registry_featured_order
  ON registry_featured(featured, featured_order);
