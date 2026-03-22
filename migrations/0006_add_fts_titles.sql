-- Migration: Add titles column to FTS table
-- Allows returning simple titles from registry_repositories instead of owner/name format

-- FTS5 doesn't support ALTER TABLE, so we need to recreate the table
DROP TABLE IF EXISTS repositories_fts;

CREATE VIRTUAL TABLE repositories_fts USING fts5(
  owner,
  name,
  description,
  language,
  registry_names,
  category_names,
  tag_names,
  titles,
  -- Non-searchable columns (stored for filtering, not indexed)
  stars UNINDEXED,
  archived UNINDEXED,
  last_commit UNINDEXED
);
