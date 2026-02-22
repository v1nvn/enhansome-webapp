# Database Query Analysis Report - N+1 Queries and Pagination Issues

## Context

This report analyzes all server functions and database calls in the enhansome-webapp codebase to identify:
- N+1 query patterns
- Functions making more than 1 database query
- Missing pagination or optional pagination

**Database State (Local = Production):**
- `repositories`: 38,368 rows
- `registry_metadata`: 233 rows
- `registry_repositories`: 41,298 rows (junction table)

**Key Technical Detail:** Categories are stored as JSON arrays in `registry_repositories.categories` column, requiring application-side parsing and aggregation.

---

## Critical N+1 Issues

### 1. `fetchMetadataHandler` - N+1 Query Pattern ⚠️ CRITICAL

**Location:** `src/lib/server-functions.ts:82-143`

**Issue:** For each registry (233 total), `getRegistryStats()` is called in a `Promise.all` loop.

```typescript
// Lines 122-136
const registriesWithStats: RegistryMetadataWithStats[] = await Promise.all(
  metadataList.map(async metadata => {
    const stats = await getRegistryStats(db, metadata.registry_name) // N+1!
    return { ... }
  }),
)
```

**Impact:**
- 1 query for `getRegistryMetadata()`
- 1 query for `registry_repositories` categories (all rows)
- **233 queries** for `getRegistryStats()` (one per registry)
- Inside each `getRegistryStats()`: 2 more queries (metadata + languages)
- **Total: ~466 queries** for this endpoint

**`getRegistryStats()` in `src/lib/db.ts:429-452`:**
```typescript
export async function getRegistryStats(db: Kysely<Database>, registryName: string) {
  const metadata = await db.selectFrom('registry_metadata')... // Query 1
  const languages = await getLanguages(db, registryName) // Query 2 - another SELECT!
  return { ... }
}
```

---

### 2. `getRepoDetail` - Sequential Queries

**Location:** `src/lib/db.ts:458-572`

**Queries (3 sequential, no N+1):**
1. Get repository by owner/name (line 482-487)
2. Get all registry associations (line 494-506)
3. Get related repos from primary registry (line 525-543)

**Impact:** 3 queries per repo detail page. Could be optimized but not N+1.

---

## Multiple Query Functions (No N+1 but >1 Query)

### 3. `fetchRegistryDetailHandler` / `getRegistryDetail`

**Location:** `src/lib/db.ts:263-385`

**Queries (4 sequential):**
1. Get metadata (line 285-296)
2. Get top 10 repos (line 303-323)
3. Get all categories for parsing (line 326-330)
4. Get unique languages (line 343-355)

**Impact:** 4 queries. Could potentially combine queries 2 & 4, but query 3 is needed for category aggregation due to JSON storage.

---

### 4. `getRegistryData`

**Location:** `src/lib/db.ts:161-257`

**Queries (2 sequential):**
1. Get metadata (line 166-170)
2. Get all items via junction table (line 177-197)

**Impact:** 2 queries. Acceptable.

---

### 5. `getCategorySummaries`

**Location:** `src/lib/db.ts:28-73`

**Queries (1 but fetches ALL data):**
```typescript
// Gets ALL rows from both tables!
const results = await db
  .selectFrom('registry_repositories')
  .innerJoin('repositories', ...)
  .execute()
```

**Impact:** Single query but fetches 41,298 rows. Then aggregates in JavaScript. No pagination, no filter.

---

### 6. Admin Indexing Functions

**`getIndexingStatusHandler`** (`src/lib/server-functions.ts:490-527`): 1 query with JOIN - OK
**`getIndexingHistoryHandler`** (`src/lib/server-functions.ts:572-583`): 1 query - OK
**`stopIndexingHandler`** (`src/lib/server-functions.ts:603-659`): 2 queries (SELECT + UPDATE) - OK

---

## Functions With Single Query (Optimal)

| Function | Location | Notes |
|----------|----------|-------|
| `getLanguages` | db.ts:118-155 | Single DISTINCT query |
| `getRegistryMetadata` | db.ts:390-424 | Single SELECT |
| `getTrendingRegistries` | db.ts:578-617 | Single SELECT with ORDER BY |
| `getFeaturedRegistries` | db.ts:78-112 | Single JOIN query |
| `getUseCaseCategoryCounts` | db.ts:623-687 | **Single query but fetches ALL rows**, then categorizes in JavaScript |

---

## Pagination Analysis

### Has Pagination

| Function | Type | Limit | Notes |
|----------|------|-------|-------|
| `searchRepos` | Cursor-based offset | 20 (default) | `searchInfiniteQueryOptions` supports infinite scroll |
| `getUseCaseCategoryItems` | Offset-based | 50 (default) | Optional `offset` param |

### NO Pagination - Potential Issues

| Function | Rows Fetched | Severity |
|----------|--------------|----------|
| `getCategorySummaries` | **ALL** (41,298+) | 🔴 HIGH |
| `getRegistryData` | **ALL repos** for one registry | 🟡 MEDIUM |
| `getRegistryDetail` | **ALL** repos in registry for categories/languages | 🟡 MEDIUM |
| `getUseCaseCategoryCounts` | **ALL** non-archived rows (41,298+) | 🔴 HIGH |
| `getRepoDetail` - related repos | Fixed 6 | 🟢 LOW (bounded) |
| `getTrendingRegistries` | Fixed 12 | 🟢 LOW (bounded) |
| `getIndexingHistory` | Fixed 50 | 🟢 LOW (bounded) |

---

## Optimization Recommendations

### Priority 1: Fix N+1 in `fetchMetadataHandler`

**Current:** 233 registries × 2 queries = 466 queries

**Solution:** Batch query all stats in a single query:
```sql
-- Single query to get all registry stats with languages pre-aggregated
SELECT
  rm.registry_name,
  rm.total_items,
  rm.total_stars,
  rm.last_updated,
  GROUP_CONCAT(DISTINCT r.language) as languages
FROM registry_metadata rm
LEFT JOIN registry_repositories rr ON rr.registry_name = rm.registry_name
LEFT JOIN repositories r ON r.id = rr.repository_id
GROUP BY rm.registry_name
```

### Priority 2: Add Pagination to Large Fetches

**`getCategorySummaries`:** Add `limit`/`offset` parameters or use a cursor
**`getUseCaseCategoryCounts`:** Already iterates ALL rows - could add pagination or caching

### Priority 3: Consider JSON Storage Normalization

Categories stored as JSON arrays prevent SQL-level filtering and aggregation. Consider:
1. Separate `categories` table
2. `repository_categories` junction table
3. Enables `GROUP BY`, `COUNT(DISTINCT)`, indexed searches

---

## Index Analysis

**Existing Indexes (Good):**
- `idx_repositories_stars` - supports trending/sort by stars
- `idx_repositories_language` - supports language filter
- `idx_repositories_search` - supports text search (owner, name, description)
- `idx_repositories_archived` - supports archived filter
- `idx_registry_repositories_registry` - supports registry joins
- `idx_registry_repositories_repository` - supports reverse lookups

**Missing:**
- No index on `repositories.last_commit` (used for "updated" sort and quality scoring)
- **Add:** `CREATE INDEX idx_repositories_last_commit ON repositories(last_commit DESC)`

---

## Summary Table

| Endpoint | Total Queries | N+1? | Paginated? | Rows Fetched | Severity |
|----------|--------------|------|------------|--------------|----------|
| `/languages` | 1 | No | N/A (distinct) | Variable | 🟢 Low |
| `/metadata` | **~466** | **YES** | No | ~41k | 🔴 Critical |
| `/trending` | 1 | No | Fixed 12 | 12 | 🟢 Low |
| `/registry-detail` | 4 | No | No | ALL in registry | 🟡 Medium |
| `/repo-detail` | 3 | No | N/A | 1 + 6 related | 🟢 Low |
| `/search` | 2 (count + data) | No | Yes (20) | 500 max | 🟢 Low |
| `/admin/indexing-status` | 1 | No | N/A | 1 | 🟢 Low |
| `/admin/indexing-history` | 1 | No | Fixed 50 | 50 | 🟢 Low |
| `/use-case-categories` | 1 (but ALL rows) | No | No | **41k+** | 🔴 High |

---

## Files Requiring Changes

1. **`src/lib/db.ts`**
   - `getRegistryStats()` - optimize or batch
   - `getCategorySummaries()` - add pagination
   - `getUseCaseCategoryCounts()` - add pagination or caching
   - Add missing index on `repositories.last_commit`

2. **`src/lib/server-functions.ts`**
   - `fetchMetadataHandler()` - batch the `getRegistryStats()` calls

3. **Database migrations**
   - Add index on `repositories(last_commit)`
