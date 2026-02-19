-- Performance indexes for large dataset queries
-- Migration: 0004_performance_indexes.sql
-- Created: 2025-02-18

-- Compound index for registry browser queries
-- Optimizes queries filtering by registry_name, category, and sorting by stars
CREATE INDEX IF NOT EXISTS idx_registry_items_browse ON registry_items(
  registry_name,
  category,
  stars DESC,
  archived
);

-- Search support with case-insensitive collation
-- Optimizes LIKE queries on title and description
CREATE INDEX IF NOT EXISTS idx_registry_items_search ON registry_items(
  registry_name,
  title COLLATE NOCASE,
  description COLLATE NOCASE
);

-- Trending calculation by star velocity and recency
-- Optimizes queries for trending registries
CREATE INDEX IF NOT EXISTS idx_registry_metadata_velocity ON registry_metadata(
  total_stars DESC,
  last_updated DESC
);

-- Category grouping performance
-- Optimizes category stats and grouping queries
CREATE INDEX IF NOT EXISTS idx_registry_items_category_stats ON registry_items(
  registry_name,
  category,
  language
);

-- Language filtering within registries
-- Optimizes language-based filter queries
CREATE INDEX IF NOT EXISTS idx_registry_items_language ON registry_items(
  registry_name,
  language COLLATE NOCASE,
  stars DESC
);

-- Archive status filtering
-- Optimizes queries excluding archived repos
CREATE INDEX IF NOT EXISTS idx_registry_items_archived ON registry_items(
  archived,
  stars DESC
);
