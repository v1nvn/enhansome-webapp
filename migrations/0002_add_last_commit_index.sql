-- Migration: Add index on repositories.last_commit for "updated" sort and quality scoring
-- Created: 2025-02-22
-- This index improves performance for sorting by last_commit date and quality score calculations

CREATE INDEX IF NOT EXISTS idx_repositories_last_commit ON repositories(last_commit DESC);
