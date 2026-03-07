-- Migration: Tags table and extended repository_facets
-- Creates tags table, repo_tags junction table, and extends repository_facets with tag_name

-- Tags table (canonical tag entries)
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction: repos → tags (per registry context)
-- category_id captures which frozen category the originating heading mapped to
CREATE TABLE repo_tags (
  repository_id INTEGER NOT NULL,
  registry_name TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  category_id INTEGER,
  PRIMARY KEY (repository_id, registry_name, tag_id),
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Extend repository_facets with tag_name (drop and recreate — it's a materialized table)
DROP TABLE IF EXISTS repository_facets;
CREATE TABLE repository_facets (
  repository_id INTEGER NOT NULL,
  registry_name TEXT NOT NULL,
  language TEXT,
  category_name TEXT,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (repository_id, registry_name, tag_name)
);

-- Indexes
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_repo_tags_repo ON repo_tags(repository_id);
CREATE INDEX idx_repo_tags_tag ON repo_tags(tag_id);
CREATE INDEX idx_repo_tags_registry ON repo_tags(registry_name);
CREATE INDEX idx_facets_registry_lang_cat
  ON repository_facets(registry_name, language, category_name, repository_id);
CREATE INDEX idx_facets_lang ON repository_facets(language);
CREATE INDEX idx_facets_category ON repository_facets(category_name);
CREATE INDEX idx_facets_tag ON repository_facets(tag_name);
CREATE INDEX idx_facets_registry_tag
  ON repository_facets(registry_name, tag_name, repository_id);
