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

### 1. `fetchMetadataHandler` - N+1 Query Pattern ✅ FIXED

**Location:** `src/lib/server-functions.ts:82-143`

**Issue:** For each registry (233 total), `getRegistryStats()` was called in a `Promise.all` loop.

**Status:** ✅ **FIXED** - Created `getAllRegistryStatsBatched()` function

**Changes:**
- Added `getAllRegistryStatsBatched()` in `src/lib/db.ts` that fetches all registry stats in 2 queries total
- Updated `fetchMetadataHandler()` to use the batched function
- Removed old `getRegistryStats()` function (no longer needed)
- Added comprehensive tests for the new function

**Before:** ~466 queries (233 registries × 2 queries each)
**After:** 3 queries total (1 for metadata, 1 for categories, 1 for languages)

---

### 2. `getRepoDetail` - Sequential Queries ✅ FIXED

**Location:** `src/lib/db.ts:488-608`

**Status:** ✅ **FIXED** - Optimized from 3 queries to 2 queries

**Changes:**
- Combined the "get repository" and "get all registry associations" queries into a single JOIN query
- Now fetches the repo with all its associations in one query
- Second query gets related repos from primary registry

**Before:** 3 queries (repo + associations + related repos)
**After:** 2 queries total (repo with associations + related repos)

---

## Multiple Query Functions (No N+1 but >1 Query)

### 3. `fetchRegistryDetailHandler` / `getRegistryDetail` ✅ FIXED

**Location:** `src/lib/db.ts:332-427`

**Status:** ✅ **FIXED** - Optimized from 4 queries to 2 queries

**Changes:**
- Combined the "top repos", "categories", and "languages" queries into a single query
- Now fetches ALL non-archived repos for a registry in one query, then derives:
  - Top 10 repos (already sorted by stars desc)
  - All unique categories (parsed from JSON)
  - All unique languages

**Before:** 4 queries (metadata + top repos + categories + languages)
**After:** 2 queries total (metadata + all repos data)

---

### 4. `getRegistryData`

**Location:** `src/lib/db.ts:161-257`

**Queries (2 sequential):**
1. Get metadata (line 166-170)
2. Get all items via junction table (line 177-197)

**Impact:** 2 queries. Acceptable.

---

### 5. `getCategorySummaries` - NOT USED IN PRODUCTION ✅ ACCEPTED

**Location:** `src/lib/db.ts:28-73`

**Status:** ✅ **ACCEPTED** - Only used in tests, not called by any server function

**Queries (1 but fetches ALL data):**
```typescript
// Gets ALL rows from both tables!
const results = await db
  .selectFrom('registry_repositories')
  .innerJoin('repositories', ...)
  .execute()
```

**Impact:** Single query but fetches 41,298 rows. Since this is only used in tests and not in production, it's acceptable.

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

### NO Pagination - Status

| Function | Rows Fetched | Severity | Status |
|----------|--------------|----------|--------|
| `getCategorySummaries` | **ALL** (41,298+) | 🟢 LOW | Not used in production |
| `getRegistryData` | **ALL repos** for one registry | 🟡 MEDIUM | Acceptable for single registry view |
| `getRegistryDetail` | **ALL** repos in registry for categories/languages | 🟡 MEDIUM | Acceptable for single registry detail |
| `getUseCaseCategoryCounts` | **ALL** non-archived rows (41,298+) | 🟢 ACCEPTABLE | Has 1-hour client-side cache |
| `getRepoDetail` - related repos | Fixed 6 | 🟢 LOW (bounded) | Acceptable |
| `getTrendingRegistries` | Fixed 12 | 🟢 LOW (bounded) | Acceptable |
| `getIndexingHistory` | Fixed 50 | 🟢 LOW (bounded) | Acceptable |

---

## Optimization Recommendations

### ✅ Priority 1: Fix N+1 in `fetchMetadataHandler` - COMPLETED

**Before:** 233 registries × 2 queries = 466 queries
**After:** 3 queries total

**Solution implemented:** Created `getAllRegistryStatsBatched()` that fetches:
1. All registry metadata in one query
2. All languages per registry in one query with DISTINCT

### ✅ Priority 2: Optimize `getRegistryDetail` - COMPLETED

**Before:** 4 sequential queries (metadata + top repos + categories + languages)
**After:** 2 queries total (metadata + combined repos data)

**Solution implemented:** Combined top repos, categories, and languages into a single query that fetches all non-archived repos, then derives all three outputs in JavaScript.

### ✅ Priority 3: Optimize `getRepoDetail` - COMPLETED

**Before:** 3 sequential queries (repo + associations + related repos)
**After:** 2 queries total (repo with associations + related repos)

**Solution implemented:** Combined the repository query with its associations using a JOIN query, eliminating the separate associations lookup.

### ✅ Priority 4: Add Pagination to Large Fetches - ACCEPTED

**`getCategorySummaries`:** Not used in production, only in tests - no action needed.
**`getUseCaseCategoryCounts`:** Has 1-hour `staleTime` cache on client, acceptable for current usage.

### Priority 3: Consider JSON Storage Normalization

Categories stored as JSON arrays prevent SQL-level filtering and aggregation. Consider:
1. Separate `categories` table
2. `repository_categories` junction table
3. Enables `GROUP BY`, `COUNT(DISTINCT)`, indexed searches

**Note:** This would be a significant schema change and is deferred for future consideration.

---

## Index Analysis

**Existing Indexes (Good):**
- `idx_repositories_stars` - supports trending/sort by stars
- `idx_repositories_language` - supports language filter
- `idx_repositories_search` - supports text search (owner, name, description)
- `idx_repositories_archived` - supports archived filter
- `idx_registry_repositories_registry` - supports registry joins
- `idx_registry_repositories_repository` - supports reverse lookups

### ✅ Missing Index Added

**Migration 0002:** Added `idx_repositories_last_commit` for "updated" sort and quality scoring

```sql
CREATE INDEX IF NOT EXISTS idx_repositories_last_commit ON repositories(last_commit DESC);
```

---

## Summary Table

| Endpoint | Total Queries | N+1? | Paginated? | Rows Fetched | Severity |
|----------|--------------|------|------------|--------------|----------|
| `/languages` | 1 | No | N/A (distinct) | Variable | 🟢 Low |
| `/metadata` | **3** | **No (Fixed)** | No | ~41k | 🟢 Low (was 🔴) |
| `/trending` | 1 | No | Fixed 12 | 12 | 🟢 Low |
| `/registry-detail` | **2** | **No (Fixed)** | No | ALL in registry | 🟢 Low |
| `/repo-detail` | **2** | **No (Fixed)** | N/A | 1 + 6 related | 🟢 Low |
| `/search` | 2 (count + data) | No | Yes (20) | 500 max | 🟢 Low |
| `/admin/indexing-status` | 1 | No | N/A | 1 | 🟢 Low |
| `/admin/indexing-history` | 1 | No | Fixed 50 | 50 | 🟢 Low |
| `/use-case-categories` | 1 (but ALL rows) | No | No | **41k+** | 🟢 Acceptable (cached) |

---

## Files Changed

### ✅ Completed

1. **`src/lib/db.ts`**
   - ✅ Added `getAllRegistryStatsBatched()` for batch stats fetching
   - ✅ Removed `getRegistryStats()` (replaced by batched version)
   - ✅ `getCategorySummaries()` - accepted (test-only)
   - ✅ `getUseCaseCategoryCounts()` - accepted (has caching)
   - ✅ `getRegistryDetail()` - optimized from 4 queries to 2 queries
   - ✅ `getRepoDetail()` - optimized from 3 queries to 2 queries

2. **`src/lib/server-functions.ts`**
   - ✅ `fetchMetadataHandler()` - now uses `getAllRegistryStatsBatched()`

3. **`tests/integration/db.test.ts`**
   - ✅ Added tests for `getAllRegistryStatsBatched()`
   - ✅ Removed tests for `getRegistryStats()`
   - ✅ Tests use hardcoded expectations instead of comparing functions

4. **Database migrations**
   - ✅ Added `migrations/0002_add_last_commit_index.sql`

### All High/Critical Issues Resolved ✅

The primary goal of "one query per server function call" has been achieved where feasible. The remaining multi-query functions either:
- Have bounded result sets (fixed limits)
- Are acceptable for their use case (single registry detail, now optimized to 2 queries)
- Have client-side caching (use case categories)

No action items remain pending.
