-- Migration: Registry-specific FTS table
-- Creates a denormalized FTS table with one row per (repository, registry, category)
-- This eliminates comma-separated fields and in-memory aggregation

CREATE VIRTUAL TABLE registry_repositories_fts USING fts5(
  -- Searchable columns
  owner,
  name,
  description,
  language,
  registry_name,
  category_name,
  tag_names,
  title,
  -- UNINDEXED columns (for filtering/sorting, not full-text search)
  repository_id UNINDEXED,
  stars UNINDEXED,
  archived UNINDEXED,
  last_commit UNINDEXED
);
