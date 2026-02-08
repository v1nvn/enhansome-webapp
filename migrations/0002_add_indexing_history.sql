-- Migration: Add indexing history and status tracking
-- Created: 2025-02-08

-- History of all indexing runs (manual and scheduled)
CREATE TABLE IF NOT EXISTS indexing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_source TEXT NOT NULL, -- 'manual' or 'scheduled'
  status TEXT NOT NULL,         -- 'running', 'completed', 'failed'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_registries INTEGER,
  processed_registries INTEGER DEFAULT 0,
  current_registry TEXT,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  errors TEXT,                  -- JSON array of error messages
  error_message TEXT,            -- Single error message if failed
  created_by TEXT                -- API key identifier (last 4 chars) for manual runs
);

-- Index for querying current/recent runs
CREATE INDEX IF NOT EXISTS idx_indexing_history_started
  ON indexing_history(started_at DESC);

-- Track current/latest run for quick status lookup
CREATE TABLE IF NOT EXISTS indexing_latest (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single-row table
  history_id INTEGER,                     -- FK to indexing_history
  status TEXT NOT NULL,                   -- Denormalized for quick access
  updated_at TEXT NOT NULL,
  FOREIGN KEY (history_id) REFERENCES indexing_history(id)
);

-- Initialize latest status
INSERT OR IGNORE INTO indexing_latest (id, history_id, status, updated_at)
VALUES (1, NULL, 'idle', datetime('now'));
