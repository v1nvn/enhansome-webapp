-- Migration: Remove admin/indexing tables
-- These tables were used for the admin indexing UI which has been removed

-- Drop index first
DROP INDEX IF EXISTS idx_indexing_history_started;

-- Drop tables (order matters due to foreign key)
DROP TABLE IF EXISTS indexing_latest;
DROP TABLE IF EXISTS indexing_history;
