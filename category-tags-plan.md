# 3-Layer Discovery System: Categories + Tags + Registries

## Context

Enhansome currently uses a single-layer category system where categories are auto-created from awesome-list section headings during indexing. While normalization keeps this to ~51 canonical categories via a 200+ synonym lookup table, the architecture has fundamental limits:

- Categories are the only dimension for precision filtering, creating pressure to create more categories
- No tag system exists (`best_for_tags` is a placeholder, never populated)
- Registry pages are tab-based information views, not browsable/filterable
- The browse page uses a horizontal FilterBar with dropdowns — no sidebar navigation
- Heading-based classification means categories depend on how upstream awesome-list authors structure their READMEs

The goal is to build a 3-layer discovery system:
1. **Categories** — frozen canonical set (~51 entries), structural, global navigation. Hard gate: no auto-creation.
2. **Tags** — the raw section headings from awesome-lists, lightly normalized. Unbounded but deduped by slug. Provide registry-level precision.
3. **Registries** — ecosystem context, dedicated browsable pages with tag-first navigation

---

## Phase 1: Schema Foundation ✅ DONE

**Goal**: Add `tags` and `repo_tags` tables, and extend `repository_facets` with a `tag_name` column. No behavior changes — existing pipeline and frontend continue to work unchanged.

### Design Decision: Tags in `repository_facets`

Tags and categories both originate from the same raw heading. Each heading produces exactly **one tag** and **0 or 1 categories**. Since there's no cartesian explosion, tags belong in `repository_facets` alongside categories — not in a separate `tag_facets` table. This gives us:

- **Single facets table** — no `tag_facets`, everything in `repository_facets`
- **Full cross-filtering** — tag counts by language, category counts by tag, all dimensions work together
- **Consistent patterns** — same Kysely query patterns, same rebuild approach
- **Tag→category provenance** — `repo_tags.category_id` tracks which category each tag mapped to

Example of how rows look (one row per heading, not per category×tag):

| repository_id | registry_name | language | category_name | tag_name |
|---|---|---|---|---|
| 1 | npm | TypeScript | React | React Hooks |
| 1 | npm | TypeScript | React | React Components |
| 1 | npm | TypeScript | NULL | Misc Tools |

### New Migration: `migrations/0003_tags_and_facets.sql`

```sql
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
```

### Files to Modify

| File | Change |
|------|--------|
| `migrations/0003_tags_and_facets.sql` | **NEW** |
| `src/types/database.ts` | Add `TagsTable`, `RepoTagsTable` interfaces; update `RepositoryFacetsTable` (add `tag_name`, make `category_name` nullable); add to `Database` |

### Verification
- `wrangler d1 migrations apply` succeeds
- Existing app works unchanged (new tables are empty, no code references them yet)
- `repository_facets` has new schema but is empty (rebuilt on next indexing run)

---

## Phase 2: Tag Pipeline + Category Freeze ✅ DONE ✅ DONE

**Goal**: Tags are derived from the **raw section headings** (the pre-normalization category names from awesome-lists). Categories are the normalized canonical set, now frozen with a hard gate. Remove pluralization. Existing frontend remains unchanged.

### Key Insight: Tags = Raw Headings

Currently, `flattenItems()` extracts each item's `category` field from the awesome-list section title. Today, that raw heading is normalized into a canonical category via `normalizeCategoryName()`. In the new model:

1. The **raw heading** itself becomes a **tag** (lightly cleaned — trimmed, emoji-removed, title-cased, deduped by slug)
2. The heading is also run through `normalizeCategoryName()` to attempt canonical **category** mapping
3. If the heading maps to a frozen canonical category → assign it. If not → the tag still captures the original intent.

This means every repo gets tags for free from the source data — no NLP extraction needed.

### 2A: Tag Normalization — `src/lib/utils/tags.ts` (NEW)

```typescript
normalizeTagName(rawHeading: string) → {name: string, slug: string} | null
```

Light normalization only (NOT the full category normalization pipeline):
1. Trim whitespace
2. Remove emojis (reuse `removeEmojis()`)
3. Remove noise prefixes/suffixes (parenthetical content, "for X", "with X")
4. Skip if in SKIP_CATEGORIES set (meta-sections like "Contents", "License", etc.)
5. Skip if ≤ 2 characters
6. Title case (reuse existing logic with acronym handling)
7. Generate slug (reuse `generateSlug()`)

No synonym mapping, no pluralization, no CATEGORY_LOOKUP. Tags preserve the original author's terminology.

### 2B: Freeze Categories (Hard Gate) — `src/lib/utils/categories.ts`

Changes to `normalizeCategoryName()`:
- **Remove pluralization** (Stage 9) — frozen set has correct display names already
- The function continues to return `{name, slug} | null` as before

The hard gate is enforced in the **indexer**, not in the normalization function:
- The indexer will only assign categories that already exist in the seeded `categories` table
- If `normalizeCategoryName()` returns a slug not in the DB → skip category assignment, log it
- No `INSERT OR IGNORE INTO categories` — categories are never created during indexing

### 2C: Update Indexer — `src/lib/indexer.ts`

In `buildRegistryStatements()`, for each repo's accumulated raw headings:

1. **Tag + Category together**: For each raw heading:
   - Call `normalizeTagName(heading)` → if valid, `INSERT OR IGNORE INTO tags (slug, name)` to get `tag_id`
   - Call `normalizeCategoryName(heading)` → if it maps to a frozen category, look up `category_id` (or NULL)
   - `INSERT INTO repo_tags (repository_id, registry_name, tag_id, category_id)` — captures both the tag and its category provenance in one row

2. **Category assignment (hard gate)**: Also insert into `registry_repository_categories` using a query that only succeeds if the category already exists (keeps existing consumers working):
   ```sql
   INSERT INTO registry_repository_categories (registry_name, repository_id, category_id)
     SELECT ?, r.id, c.id
     FROM repositories r
     CROSS JOIN categories c
     WHERE r.owner = ? AND r.name = ? AND c.slug = ?
   ```
   If the category slug doesn't exist in the seeded `categories` table, the SELECT returns 0 rows and nothing is inserted. Log these misses.

3. **No `INSERT OR IGNORE INTO categories`** — this line is removed entirely.

In `rebuildFacets()`:
- Replace the current rebuild with a unified query that produces both category and tag data from `repo_tags`:
```sql
DELETE FROM repository_facets;
INSERT INTO repository_facets (repository_id, registry_name, language, category_name, tag_name)
  SELECT r.id, rt.registry_name, r.language, c.name, t.name
  FROM repositories r
  JOIN repo_tags rt ON rt.repository_id = r.id
  JOIN tags t ON t.id = rt.tag_id
  LEFT JOIN categories c ON c.id = rt.category_id
  WHERE r.archived = 0;
```
The `category_id` in `repo_tags` provides the direct link — no need to re-derive the tag→category mapping.

### 2D: Seed Categories — `migrations/0004_seed_categories.sql` (NEW)

Pre-populate the `categories` table with all canonical names from `CATEGORY_LOOKUP`. This ensures the frozen set exists before the first indexing run with the new pipeline. The indexer will then only match against existing categories — never create new ones.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/utils/tags.ts` | **NEW** — Light tag normalization (from raw headings) |
| `migrations/0004_seed_categories.sql` | **NEW** — Seed canonical categories |
| `src/lib/utils/categories.ts` | Remove pluralization from normalization |
| `src/lib/indexer.ts` | Hard gate for categories (no INSERT), tag creation from raw headings with `category_id`, unified `rebuildFacets()` |

### Verification
- Run indexer → `tags` table populated with cleaned-up raw headings
- `repo_tags` links repos to their tags, each row includes `category_id` when the heading mapped to a frozen category
- `repository_facets` rebuilt with both `category_name` and `tag_name` columns
- `categories` table unchanged (no new rows created beyond the seed set)
- Existing frontend works unchanged (same categories in `repository_facets`, tag_name ignored by existing queries)
- Console logs show any headings that normalized to a category slug not in the frozen set

---

## Phase 3: API Layer for Tags ✅ DONE ✅ DONE

**Goal**: Expose tags through the API. Add tag-based filtering to search. Update filter options to include tags. Update registry detail to include top tags. Frontend still works unchanged (new fields are additive).

### 3A: Tag Repository — `src/lib/db/repositories/tag-repository.ts` (NEW)

```typescript
getTagsByRegistry(db, registryName, limit?) → {name, slug, count}[]
  // COUNT(DISTINCT repository_id) FROM repository_facets WHERE registry_name = ? GROUP BY tag_name

getTagsForRepo(db, repoId) → {name, slug}[]
  // JOINs repo_tags + tags WHERE repository_id = ?

getGlobalTopTags(db, limit?) → {name, slug, count}[]
  // COUNT(DISTINCT repository_id) FROM repository_facets GROUP BY tag_name
```

### 3B: Update Search — `src/lib/db/repositories/search-repository.ts`

- Add `tagName?: string` to `SearchRepositoryParams` and `GetFilterOptionsParams`
- In `searchRepos()`: when `tagName` provided, filter via `WHERE f.tag_name = ?` on `repository_facets` (same pattern as existing `WHERE f.category_name = ?`)
- In `getFilterOptions()`: add 4th parallel query against `repository_facets` (same pattern as category/registry/language queries):
  ```typescript
  // Tag counts: cross-filtered by registry + language + category, NOT by tag
  let tagQuery = db
    .selectFrom('repository_facets as f')
    .select([
      'f.tag_name as value',
      sql<number>`COUNT(DISTINCT f.repository_id)`.as('count'),
    ])
    .groupBy('f.tag_name')

  if (registryName) tagQuery = tagQuery.where('f.registry_name', '=', registryName)
  if (language) tagQuery = tagQuery.where('f.language', '=', language)
  if (categoryName) tagQuery = tagQuery.where('f.category_name', '=', categoryName)
  ```
- Add `tags?: {count: number; name: string}[]` to `FilterOptions`
- Add `tags: string[]` to `SearchResult.data` items — aggregate from `f.tag_name` alongside existing `f.category_name` aggregation

### 3C: Update API Handlers

| File | Change |
|------|--------|
| `src/lib/api/handlers/search-handlers.ts` | Pass `tagName` through to `searchRepos` and `getFilterOptions` |
| `src/lib/api/server-functions.ts` | Add `tagName` to `SearchParams`, `FetchFilterOptionsInput`, and `searchInfiniteQueryOptions` queryKey |

### 3D: Update Registry Detail

In `src/lib/db/repositories/registry-repository.ts` (or wherever `getRegistryDetail` lives):
- Query `SELECT tag_name, COUNT(DISTINCT repository_id) FROM repository_facets WHERE registry_name = ? GROUP BY tag_name ORDER BY count DESC LIMIT 50`
- Return `tags: {name, count}[]` in the registry detail response

### 3E: Update Repo Detail

In `src/lib/db/repositories/repository-repository.ts`:
- Query `repo_tags JOIN tags WHERE repository_id = ?`
- Return `tags: string[]` in the repo detail response

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/db/repositories/tag-repository.ts` | **NEW** |
| `src/lib/db/repositories/search-repository.ts` | Add `tagName` filter, tags in FilterOptions, tags in search results |
| `src/lib/db/repositories/registry-repository.ts` | Add tags to registry detail |
| `src/lib/db/repositories/repository-repository.ts` | Add tags to repo detail |
| `src/lib/api/handlers/search-handlers.ts` | Pass `tagName` through |
| `src/lib/api/server-functions.ts` | Add `tagName` to params, queryKey |

### Verification
- `searchReposFn({tagName: 'react'})` returns filtered results
- `fetchFilterOptions({registryName: 'npm'})` includes `tags` array
- `fetchRegistryDetail({name: 'npm'})` includes `tags` with counts
- Existing frontend works unchanged (ignores new `tags` fields)

---

## Phase 4: Browse Page — Sidebar + Breadcrumbs 🚧 IN PROGRESS

**Goal**: Transform `/browse` from horizontal-filter-only to a sidebar-based layout. Categories are primary navigation in the sidebar. Registries are secondary. Tags do NOT appear in the global browse sidebar. BrowseCards gain registry badge + top 3 tags.

### 4A: CategorySidebar — `src/components/browse/CategorySidebar.tsx` (NEW)

Left sidebar component:
- **Categories section** (primary): Scrollable list of categories with repo counts. Selected category highlighted. Click to filter.
- **Registries section** (secondary): Collapsible list below categories with counts. Click to filter.
- **Active filter indicators** + "Clear all" link

### 4B: Breadcrumbs — `src/components/Breadcrumbs.tsx` (NEW)

Contextual breadcrumbs:
- `/browse` → `Browse`
- `/browse?cat=React` → `Browse > React`
- `/browse?registry=npm` → `Browse > npm`
- `/browse?registry=npm&cat=React` → `Browse > npm > React`

Uses TanStack Router `<Link>` for each segment.

### 4C: MobileFilterPanel — `src/components/browse/MobileFilterPanel.tsx` (NEW)

Slide-out panel (from left) for mobile screens (`< lg`). Contains same content as `CategorySidebar`. Triggered by a filter icon button visible only on mobile.

### 4D: Update BrowseCard — `src/components/browse/BrowseCard.tsx`

Add to card:
- **Registry badge**: Small pill showing which registry(ies) the item is from
- **Top 3 tags**: Small pills below description, visually distinct from category pills
- Tags data comes from the new `tags: string[]` field on search results (Phase 3)

### 4E: Simplify FilterBar — `src/components/browse/FilterBar.tsx`

Remove Category and Registry dropdowns (they move to sidebar). FilterBar retains:
- Search input
- Sort dropdown
- Language dropdown

### 4F: Update Browse Route — `src/routes/browse.tsx`

Transform to two-column layout:
```
┌─────────────────────────────────────────────┐
│ Breadcrumbs                                 │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ FilterBar (search + sort + lang) │
│          │                                  │
│ Category │ ┌──────┐ ┌──────┐ ┌──────┐      │
│ • Cat A  │ │ Card │ │ Card │ │ Card │      │
│ • Cat B  │ └──────┘ └──────┘ └──────┘      │
│ • Cat C  │ ┌──────┐ ┌──────┐ ┌──────┐      │
│          │ │ Card │ │ Card │ │ Card │      │
│ Registry │ └──────┘ └──────┘ └──────┘      │
│ • npm    │                                  │
│ • pypi   │ [Load More]                      │
└──────────┴──────────────────────────────────┘
```

- Add `tag` search param to `BrowseSearch`
- Sidebar hidden on mobile, filter icon shows `MobileFilterPanel`
- All existing URL patterns (`/browse?cat=X&registry=Y&lang=Z`) continue to work

### Files to Modify

| File | Change |
|------|--------|
| `src/components/browse/CategorySidebar.tsx` | **NEW** |
| `src/components/browse/MobileFilterPanel.tsx` | **NEW** |
| `src/components/Breadcrumbs.tsx` | **NEW** |
| `src/components/browse/BrowseCard.tsx` | Add registry badge, top 3 tags |
| `src/components/browse/FilterBar.tsx` | Remove category/registry dropdowns |
| `src/routes/browse.tsx` | Two-column layout, breadcrumbs, mobile panel, `tag` search param |

### Verification
- `/browse` renders with left sidebar showing categories + registries with counts
- Clicking a category in sidebar filters results, updates breadcrumbs and URL
- Clicking a registry in sidebar filters results, updates breadcrumbs and URL
- BrowseCards show category pills, registry badge, and tag pills
- Mobile: sidebar hidden, filter icon opens slide-out panel
- FilterBar has search + sort + language only
- All existing URL patterns still work

---

## Phase 5: Registry Page — Tag Sidebar

**Goal**: Transform `/registry/:name` from a tab-based information view to a sidebar-based browsable page. Tags are primary navigation (top 30-50). Categories are secondary. Registry is locked (no registry filter).

### 5A: RegistryTagSidebar — `src/components/registry/RegistryTagSidebar.tsx` (NEW)

Left sidebar:
- **Tags section** (primary): Top 30-50 tags with counts, scrollable. Optional search-within-tags input.
- **Categories section** (secondary): Collapsible list with counts.
- Max 20 visible tags on mobile (per spec)

### 5B: Redesign RegistryDetail — `src/components/RegistryDetail.tsx`

Replace current tab-based layout with sidebar + browsable card grid:
```
┌──────────────────────────────────────────────┐
│ Breadcrumbs: Browse > npm                    │
├──────────┬───────────────────────────────────┤
│ Sidebar  │ Registry Header (slim)            │
│          │ Stats: 1200 repos, 500k stars     │
│ Tags     │ ─────────────────────────────     │
│ • react  │ Search + Sort                     │
│ • next   │                                   │
│ • hooks  │ ┌──────┐ ┌──────┐ ┌──────┐       │
│ • ...    │ │ Card │ │ Card │ │ Card │       │
│          │ └──────┘ └──────┘ └──────┘       │
│ Category │                                   │
│ • Web    │ [Load More]                       │
│ • API    │                                   │
└──────────┴───────────────────────────────────┘
```

- Uses `searchReposFn` with `registryName` locked + optional `tagName`/`categoryName` filters
- Supports infinite scroll (reuse same pattern from browse page)
- Mobile: filter icon → slide-out with RegistryTagSidebar content

### 5C: Update Registry Route — `src/routes/registry.$name.tsx`

Add search params:
```typescript
interface RegistrySearch {
  tag?: string
  cat?: string
  q?: string
  sort?: 'name' | 'quality' | 'stars' | 'updated'
}
```

Breadcrumbs: `Browse > npm` → `Browse > npm > react` (when tag selected)

### Files to Modify

| File | Change |
|------|--------|
| `src/components/registry/RegistryTagSidebar.tsx` | **NEW** |
| `src/components/RegistryDetail.tsx` | Full redesign: sidebar layout, remove tabs, card grid |
| `src/routes/registry.$name.tsx` | Add search params, use searchReposFn for filtered browsing |

### Verification
- `/registry/npm` shows sidebar with top tags (with counts) and categories
- Clicking a tag filters results within the registry
- Breadcrumbs update: `Browse > npm > react`
- Mobile: filter icon opens slide-out
- Stats summary visible above grid
- Registry header still shows title, description, total repos/stars

---

## Phase 6: Homepage Redesign

**Goal**: Transform homepage from hero-search + horizontal-scroll categories + framework-pills into a structured discovery entry point: dominant search, Explore by Registry grid, Browse by Category list, optional Trending Tags.

### 6A: RegistryExplorer — `src/components/home/RegistryExplorer.tsx` (NEW)

Visual grid of registry cards:
- Registry name/title, short description
- Total repos count, total stars
- Links to `/registry/:name`
- Data: reuse `fetchTrendingRegistries()` (already exists)

### 6B: CategoryBrowser — `src/components/home/CategoryBrowser.tsx` (NEW)

Structured category list (replaces `UseCaseCards` horizontal scroll):
- Top 20-30 categories with repo counts
- Links to `/browse?cat=X`
- Grid or column layout, not horizontal scroll

### 6C: TrendingTags — `src/components/home/TrendingTags.tsx` (NEW)

Horizontal row of popular tags:
- Top 20 global tags
- Links to `/browse?tag=X`
- Data: new `fetchTrendingTags()` server function using `getGlobalTopTags()` from tag-repository

### 6D: Update Homepage — `src/routes/index.tsx`

New section order:
1. **Hero search** — simplified, no filter dropdowns. Just a search input → navigates to `/browse?q=...`
2. **Explore by Registry** — `RegistryExplorer` grid
3. **Browse by Category** — `CategoryBrowser` list
4. **Trending Tags** — `TrendingTags` row (optional)

Remove: `EnhancedSearchBar` (replaced with simpler input), `UseCaseCards`, `FrameworkPills`

### Files to Modify

| File | Change |
|------|--------|
| `src/components/home/RegistryExplorer.tsx` | **NEW** |
| `src/components/home/CategoryBrowser.tsx` | **NEW** |
| `src/components/home/TrendingTags.tsx` | **NEW** |
| `src/routes/index.tsx` | New layout, simplified search, new sections |
| `src/lib/api/server-functions.ts` | Add `fetchTrendingTags()` endpoint + query options |
| `src/components/home/UseCaseCards.tsx` | Delete or keep as fallback |
| `src/components/home/FrameworkPills.tsx` | Delete or keep as fallback |

### Verification
- Homepage loads with hero search, registry grid, category list, trending tags
- Search navigates to `/browse?q=...` (no inline filter dropdowns)
- Registry cards link to `/registry/:name`
- Category items link to `/browse?cat=X`
- Trending tags link to `/browse?tag=X`
- Mobile responsive

---

## Phase 7: Polish + Repo Detail Tags + Cleanup

**Goal**: Final polish. Add tags to repo detail page. Clean up deprecated code. Add any missing entropy prevention.

### 7A: Repo Detail Tags — `src/components/RepoDetail.tsx`

API already returns tags (Phase 3). Add:
- Tag pills section below categories
- Tags link to `/browse?tag=X`

### 7B: Cleanup

- Remove unused `EnhancedSearchBar` if fully replaced
- Remove `FrameworkPills` and `UseCaseCards` if fully replaced
- Remove `pluralize` calls from category pipeline
- Remove unused category/registry dropdown code from FilterBar
- Verify no dead imports or unused types

### 7C: Entropy Prevention Verification

Confirm:
- Categories table has no auto-creation path in production code
- Tags are created via `INSERT OR IGNORE` (deduped by slug)
- No tag → category auto-promotion exists
- Unmapped category headings logged during indexing

### Files to Modify

| File | Change |
|------|--------|
| `src/components/RepoDetail.tsx` | Render tags |
| Various | Delete unused components/code |

### Verification
- Repo detail page shows tags
- No dead code or unused imports
- Full end-to-end flow: Index → Tags extracted → Browse with sidebar → Filter by tag → Registry page with tag sidebar → Repo detail with tags

---

## Dependency Graph

```
Phase 1 (Schema)
  ↓
Phase 2 (Pipeline)
  ↓
Phase 3 (API)
  ↓           ↘
Phase 4         Phase 6
(Browse)        (Homepage)
  ↓               ↓
Phase 5           ↓
(Registry)        ↓
  ↓               ↓
Phase 7 (Polish) ←┘
```

Phases 4 and 6 can be developed in parallel after Phase 3.
Phase 5 depends on Phase 4 (reuses sidebar patterns).
Phase 7 depends on all prior phases.

---

## D1-Specific Constraints

- **Batch limit**: Max 100 statements per `db.batch()`. Tag INSERTs must be batched (reuse existing `SYNC_LOG_BATCH_SIZE = 100` pattern).
- **No runtime COUNTs in hot paths**: All facets (categories + tags) precomputed in `repository_facets`. Sidebar reads from this single denormalized table, not JOINs with GROUP BY.
- **Migration safety**: Phase 1 migration drops and recreates `repository_facets` (materialized table, rebuilt on next indexing run). Other migrations are additive (new tables). Each phase can be deployed independently.

## Key Files Reference

| Component | Path |
|-----------|------|
| Schema migrations | `migrations/` |
| Indexer | `src/lib/indexer.ts` |
| Category normalization | `src/lib/utils/categories.ts` |
| Search queries | `src/lib/db/repositories/search-repository.ts` |
| Registry queries | `src/lib/db/repositories/registry-repository.ts` |
| Repo queries | `src/lib/db/repositories/repository-repository.ts` |
| API handlers | `src/lib/api/handlers/search-handlers.ts` |
| Server functions | `src/lib/api/server-functions.ts` |
| Database types | `src/types/database.ts` |
| Browse page | `src/routes/browse.tsx` |
| Registry page | `src/routes/registry.$name.tsx` |
| Homepage | `src/routes/index.tsx` |
| BrowseCard | `src/components/browse/BrowseCard.tsx` |
| FilterBar | `src/components/browse/FilterBar.tsx` |
| RegistryDetail | `src/components/RegistryDetail.tsx` |
| RepoDetail | `src/components/RepoDetail.tsx` |

---

## Implementation Progress

### ✅ Phase 1: Schema Foundation — COMPLETE
- `migrations/0003_tags_and_facets.sql` — `tags`, `repo_tags` tables, extended `repository_facets`
- `src/types/database.ts` — new table types

### ✅ Phase 2: Tag Pipeline + Category Freeze — COMPLETE
- `src/lib/utils/tags.ts` — `normalizeTagName()` for light tag normalization
- `migrations/0004_seed_categories.sql` — 165 frozen canonical categories
- `src/lib/utils/categories.ts` — removed pluralization
- `src/lib/indexer.ts` — hard gate for categories, tag creation with `category_id`, unified `rebuildFacets()`
- `tests/helpers/seed-frozen-categories.ts` — test helper for seeding categories
- `tests/unit/tags.test.ts` — 16 tests for `normalizeTagName()`

### ✅ Phase 3: API Layer for Tags — COMPLETE
- `src/lib/db/repositories/tag-repository.ts` — `getGlobalTopTags()`, `getTagsByRegistry()`, `getTagsForRepo()`
- `src/lib/db/repositories/search-repository.ts` — `tagName` filter, `tags` in FilterOptions and search results
- `src/lib/api/handlers/search-handlers.ts` — `tagName` parameter
- `src/lib/api/server-functions.ts` — `tagName` in params and queryKey
- `src/lib/db/repositories/registry-repository.ts` — `tags` in registry detail
- `src/lib/db/repositories/repository-repository.ts` — `tags` in repo detail

### ✅ Phase 4: Browse Page — Sidebar + Breadcrumbs — COMPLETE
- `src/components/browse/CategorySidebar.tsx` — created
- `src/components/Breadcrumbs.tsx` — created
- `src/components/browse/MobileFilterPanel.tsx` — created
- `src/components/browse/BrowseCard.tsx` — updated with registry badge + tags
- `src/components/browse/FilterBar.tsx` — simplified (search + sort only)
- `src/routes/browse.tsx` — two-column layout with sidebar

### ✅ Phase 5: Registry Page — Tag Sidebar — COMPLETE
- `src/components/registry/RegistryTagSidebar.tsx` — created
- `src/components/RegistryDetail.tsx` — redesigned with sidebar + card grid
- `src/routes/registry.$name.tsx` — added search params + infinite scroll

### ✅ Phase 6: Homepage Redesign — COMPLETE
- `src/components/home/RegistryExplorer.tsx` — created
- `src/components/home/CategoryBrowser.tsx` — created
- `src/components/home/TrendingTags.tsx` — created
- `src/lib/api/server-functions.ts` — added `fetchTrendingTags()`
- `src/routes/index.tsx` — simplified hero search, new sections

### ✅ Phase 7: Polish + Repo Detail Tags + Cleanup — COMPLETE
- Updated `src/components/RepoDetail.tsx`:
  - Added tags display below categories
  - Tags link to `/browse?tag=X`
  - TagBadge component with hash icon
- Cleanup:
  - Removed `src/components/EnhancedSearchBar.tsx` (replaced by simple search input)
  - Removed `src/components/home/FrameworkPills.tsx` (replaced by TrendingTags)
  - Removed `src/components/home/UseCaseCards.tsx` (replaced by CategoryBrowser)
  - Updated `src/components/home/index.ts` exports
- Tests:
  - Added `fetchTrendingTagsHandler` tests in server-functions.test.ts
  - Updated seed-test-data.ts to seed tags table

---

## Implementation Progress

### ✅ Phase 1: Schema Foundation — COMPLETE
- Created `migrations/0003_tags_and_facets.sql` with `tags`, `repo_tags` tables
- Extended `repository_facets` with `tag_name` column, made `category_name` nullable
- Updated `src/types/database.ts` with new table types

### ✅ Phase 2: Tag Pipeline + Category Freeze — COMPLETE
- Created `src/lib/utils/tags.ts` with `normalizeTagName()` for light tag normalization
- Created `migrations/0004_seed_categories.sql` with 165 frozen canonical categories
- Removed pluralization from `src/lib/utils/categories.ts`
- Updated `src/lib/indexer.ts`:
  - Hard gate for categories (only match existing frozen categories)
  - Tags created from raw headings with `category_id` provenance
  - Unified `rebuildFacets()` using `repo_tags` join
- Created `tests/helpers/seed-frozen-categories.ts` for test setup
- Created `tests/unit/tags.test.ts` with 16 tests for `normalizeTagName()`

### ✅ Phase 3: API Layer for Tags — COMPLETE
- Created `src/lib/db/repositories/tag-repository.ts` with:
  - `getGlobalTopTags()` - top tags across all registries
  - `getTagsByRegistry()` - tags for a specific registry
  - `getTagsForRepo()` - tags for a specific repository
- Updated `src/lib/db/repositories/search-repository.ts`:
  - Added `tagName` to search params
  - Added `tags` to FilterOptions
  - Added `tags` to search results
  - Added tag query with cross-filtering
- Updated `src/lib/api/handlers/search-handlers.ts` with `tagName` parameter
- Updated `src/lib/api/server-functions.ts`:
  - Added `tagName` to `SearchParams` and `FetchFilterOptionsInput`
  - Added `tagName` to `searchInfiniteQueryOptions` queryKey
- Updated `src/lib/db/repositories/registry-repository.ts`:
  - Added `tags` to `getRegistryDetail()` return type
- Updated `src/lib/db/repositories/repository-repository.ts`:
  - Added `tags` to `getRepoDetail()` return type

### ✅ Phase 4: Browse Page — Sidebar + Breadcrumbs — COMPLETE
- Created `src/components/browse/SidebarFilterSection.tsx`:
  - Reusable component for sidebar filter sections
  - Search input for filtering within section
  - Max height with scroll for long lists
- Created `src/components/browse/CategorySidebar.tsx`:
  - Categories section with search + max-h-64
  - Registries section with search + max-h-40
  - Languages section (moved from FilterBar)
- Created `src/components/Breadcrumbs.tsx`:
  - Home link + dynamic breadcrumb items
  - Supports registry, category, and tag navigation
- Created `src/components/browse/MobileFilterPanel.tsx`:
  - Slide-out panel for mobile screens
  - Reuses CategorySidebar content
- Updated `src/components/browse/BrowseCard.tsx`:
  - Added registry badge (top 2 registries)
  - Added top 3 tags display with tag icon
- Simplified `src/components/browse/FilterBar.tsx`:
  - Removed category dropdown (moved to sidebar)
  - Removed registry dropdown (moved to sidebar)
  - Removed language dropdown (moved to sidebar)
  - Retained search input + sort dropdown only
- Deleted `src/components/browse/FilterDropdown.tsx` (unused)
- Updated `src/routes/browse.tsx`:
  - Search bar full-width on top (above sidebar and grid)
  - Two-column layout (sidebar + main content)
  - Breadcrumbs navigation
  - Mobile filter button + panel
  - Added `tag` search param support
  - Replaced "Load More" button with infinite scroll (IntersectionObserver)

### ✅ Phase 5: Registry Page — Tag Sidebar — COMPLETE
- Created `src/components/registry/RegistryTagSidebar.tsx`:
  - Tags section (primary) with top 30-50 tags
  - Categories section (secondary, collapsible)
- Created `src/components/registry/RegistryMobileFilterPanel.tsx`:
  - Reusable mobile filter panel following browse patterns
- Redesigned `src/components/RegistryDetail.tsx`:
  - Uses FilterBar component (same as browse page)
  - Uses RegistryMobileFilterPanel (same patterns as browse)
  - Uses RegistryTagSidebar for sidebar
  - Infinite scroll with IntersectionObserver
  - Mobile filter button + panel
- Updated `src/routes/registry.$name.tsx`:
  - Added `tag`, `cat`, `q`, `sort` search params
  - Breadcrumbs support for registry navigation
  - Preloads filter options for initial render

### ✅ Phase 6: Homepage Redesign — COMPLETE
- Created `src/components/home/RegistryExplorer.tsx`:
  - Visual grid of registry cards with repo count and stars
  - Links to `/registry/:name`
- Created `src/components/home/CategoryBrowser.tsx`:
  - Grid layout of categories with counts
  - Links to `/browse?cat=X`
- Created `src/components/home/TrendingTags.tsx`:
  - Horizontal row of popular tags
  - Links to `/browse?tag=X`
- Added `fetchTrendingTagsHandler()` in registry-handlers.ts
- Added `fetchTrendingTags()` and `trendingTagsQueryOptions()` in server-functions.ts
- Updated `src/routes/index.tsx`:
  - Simplified hero search (just input, navigates to `/browse?q=...`)
  - New section order: RegistryExplorer, CategoryBrowser, TrendingTags
  - Removed EnhancedSearchBar inline filters
- Updated `src/components/home/index.ts` with new exports

### ✅ Phase 7: Polish + Repo Detail Tags + Cleanup — COMPLETE
- Updated `src/components/RepoDetail.tsx`:
  - Added tags display section below categories
  - Tags link to `/browse?tag=X`
  - Added TagBadge component with Hash icon
- Cleanup:
  - Deleted `src/components/EnhancedSearchBar.tsx` (replaced by simple search input)
  - Deleted `src/components/home/FrameworkPills.tsx` (replaced by TrendingTags)
  - Deleted `src/components/home/UseCaseCards.tsx` (replaced by CategoryBrowser)
  - Updated `src/components/home/index.ts` to remove deleted exports
- Tests:
  - Added `fetchTrendingTagsHandler` tests in `tests/integration/server-functions.test.ts`
  - Updated `tests/helpers/seed-test-data.ts` to seed tags table for integration tests
