CREATE TABLE repository_facets (
  repository_id INTEGER NOT NULL,
  registry_name TEXT NOT NULL,
  language TEXT,
  category_name TEXT NOT NULL,
  PRIMARY KEY (repository_id, registry_name, category_name)
);

CREATE INDEX idx_facets_registry_lang_cat
  ON repository_facets(registry_name, language, category_name, repository_id);
CREATE INDEX idx_facets_lang
  ON repository_facets(language);
CREATE INDEX idx_facets_category
  ON repository_facets(category_name);
