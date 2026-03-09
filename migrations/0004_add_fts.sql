-- Migration: FTS5 full-text search for repositories
-- Creates virtual table for natural language search across repos, registries, categories, tags

-- FTS5 virtual table for repository search
-- Includes all searchable text + columns needed for filtering
-- The FTS index is rebuilt manually after each indexing run via rebuildFtsIndex().
CREATE VIRTUAL TABLE IF NOT EXISTS repositories_fts USING fts5(
  owner,
  name,
  description,
  language,
  registry_names,
  category_names,
  tag_names,
  -- Non-searchable columns (stored for filtering, not indexed)
  stars UNINDEXED,
  archived UNINDEXED,
  last_commit UNINDEXED
);
