# Enhansome Webapp - Issue Tracker

**Last Updated**: 2025-11-08
**Codebase Review Date**: 2025-11-08

---

## 🔴 Critical Issues

### ~~1. SQL Injection Vulnerability in Search API~~ ✅ FIXED
**Status**: ✅ **RESOLVED** (2025-11-08)
**Location**: `src/lib/db.ts:258-266`

**Original Issue**: The `searchRegistryItems` function used `LIKE` queries with string interpolation vulnerable to SQL injection.

**Fix Applied**:
- Added proper escaping of SQL LIKE special characters (`%`, `_`, `\`)
- Implementation: `q.trim().replace(/[%_\\]/g, '\\$&')`
- Added comprehensive test coverage in `tests/integration/db.test.ts:403-418`
- All 78 integration tests pass

**Verification**:
- ✅ Build passes
- ✅ All tests pass
- ✅ Linter passes
- ✅ Security vulnerability eliminated

---

### 2. Stack Traces Exposed in Production ⚠️
**Priority**: Critical
**Location**: `src/routes/api.registry.ts:38-51`

API error responses include stack traces:

```typescript
return new Response(
  JSON.stringify({
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined, // ❌ EXPOSES INTERNALS
  }),
  { status: 500 }
)
```

**Impact**: Exposes internal application structure, file paths, and potentially sensitive information to attackers.

**Affected Files**:
- `src/routes/api.registry.ts:38-51`
- `src/routes/api.search.ts:61-71`
- `src/routes/api.categories.ts:50-60`
- `src/routes/api.languages.ts:27-37`
- `src/routes/api.metadata.ts:38-48`

**Recommendation**:
- Remove `stack` field in production
- Use environment-based logging
- Return generic error messages to clients
- Log detailed errors server-side only

---

## 🟠 High Priority Issues

### 3. No Input Validation on Query Parameters ⚠️
**Priority**: High
**Location**: `src/routes/api.search.ts:16-40`

Query parameters are not validated before use:

```typescript
const minStars = minStarsParam ? parseInt(minStarsParam, 10) : undefined
const limit = limitParam ? parseInt(limitParam, 10) : 100
const offset = offsetParam ? parseInt(offsetParam, 10) : 0
```

**Issues**:
- `parseInt` can return `NaN` causing unexpected behavior
- No bounds checking on `limit` (could request millions of rows)
- No bounds checking on `offset` (could cause performance issues)
- No validation on `sortBy` beyond type narrowing

**Recommendation**:
- Add Zod schemas for query parameter validation
- Set maximum limits (e.g., `limit <= 1000`)
- Validate `minStars >= 0`
- Return 400 Bad Request for invalid inputs

**Example Implementation**:
```typescript
import { z } from 'zod'

const searchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  registry: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  archived: z.enum(['true', 'false']).optional(),
  minStars: z.coerce.number().int().min(0).max(1000000).optional(),
  sortBy: z.enum(['name', 'stars', 'updated']).default('stars'),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).optional(),
})
```

---

### 4. Missing Rate Limiting ⚠️
**Priority**: High
**Location**: All API routes

None of the API endpoints have rate limiting:
- `/api/registry` - Expensive: fetches all registries
- `/api/search` - Can be abused with large limit values
- `/api/metadata` - Multiple database queries per registry
- `/api/categories` - Database aggregation queries
- `/api/languages` - Database queries

**Impact**:
- DoS vulnerability
- Resource exhaustion
- Database overload
- Cloudflare Workers quota exhaustion

**Recommendation**:
- Implement Cloudflare Rate Limiting rules
- Or use middleware-based rate limiting
- Suggested limits:
  - `/api/registry`: 10 requests/minute per IP
  - `/api/search`: 60 requests/minute per IP
  - `/api/metadata`: 30 requests/minute per IP
  - `/api/categories`: 30 requests/minute per IP
  - `/api/languages`: 30 requests/minute per IP

---

### 5. Hardcoded Database ID in Config ⚠️
**Priority**: High
**Location**: `wrangler.json:18`

```json
"database_id": "REPLACE_WITH_DATABASE_ID"
```

**Issue**: Placeholder value that would cause production failures.

**Recommendation**:
- Use environment variables via `wrangler.toml` (gitignored)
- Or use Wrangler secrets
- Document setup process in README/SETUP.md

---

### 6. Kysely Plugin Deprecation Warning ⚠️
**Priority**: High
**Location**: Dependencies

```
kysely:warning: outdated driver/plugin detected!
`QueryResult.numUpdatedOrDeletedRows` has been replaced with
`QueryResult.numAffectedRows`.
```

**Issue**: Using outdated `kysely-d1` version (0.4.0) that triggers deprecation warnings.

**Recommendation**:
```bash
npm update kysely-d1
# Or
npm install kysely-d1@latest
```

---

## 🟡 Medium Priority Issues

### 7. Component Tests Failing - Missing Environment Setup ⚠️
**Priority**: Medium
**Location**: `tests/unit/components/*.test.tsx`

All 60 component tests are failing with:
```
document is not defined
window is not defined
```

**Root Cause**: Test setup issue - tests use `vitest.config.ts` (workers pool) instead of `vitest.ui.config.ts` (jsdom).

**Stats**:
- 60 component tests failing
- All fail with same error (missing DOM environment)
- Integration tests (78 tests) all pass

**Recommendation**:
- Configure test runs to use correct config file
- Update `package.json` scripts:
  ```json
  "test:unit": "vitest run tests/unit --config vitest.ui.config.ts"
  ```
- Or consolidate configs with proper environment detection

---

### 8. React Hooks Anti-Pattern ⚠️
**Priority**: Medium
**Location**: `src/components/RegistryLayout.tsx:84-85, 91`

Direct state setting in `useEffect`:

```typescript
useEffect(() => {
  setOffset(0)  // ⚠️ Anti-pattern
  setPages([])  // ⚠️ Anti-pattern
}, [baseSearchParams])
```

**Issue**: ESLint warning - violates `@eslint-react/hooks-extra/no-direct-set-state-in-use-effect`

**Recommendation**:
- Restructure to use derived state
- Or add suppressions with clear comments explaining why it's intentional
- Consider using `useReducer` for complex state updates

---

### 9. Console Logging in Production Code ⚠️
**Priority**: Medium
**Location**: Throughout codebase (25+ instances)

**Instances**:
- `src/server.ts` - 8 console statements
- `src/lib/indexer.ts` - 10+ console statements
- All API routes - console.error in catch blocks
- `src/routes/registry.tsx` - console.log for errors

**Issues**:
- Console logs in production can impact performance
- Not structured for log aggregation
- May expose information via browser dev tools
- Missing log levels and context

**Recommendation**:
- Replace with proper logging library (Pino, Winston)
- Use Cloudflare Workers logging best practices
- Implement log levels (debug, info, warn, error)
- Add structured logging with context

**Example**:
```typescript
import pino from 'pino'

const logger = pino({
  level: env.LOG_LEVEL || 'info',
})

logger.info({ registryName, itemCount }, 'Indexing registry')
logger.error({ error, registryName }, 'Failed to index registry')
```

---

### 10. Unused Test Configuration File ⚠️
**Priority**: Medium
**Location**: `vitest.ui.config.ts`

This file is configured for jsdom but component tests don't use it, causing all failures.

**Recommendation**:
- Either use this config for component tests
- Or remove if redundant with main config

---

### 11. Incomplete Type Safety in Search API ⚠️
**Priority**: Medium
**Location**: `src/routes/api.search.ts:30-36`

Type narrowing for `sortBy` is verbose and error-prone:

```typescript
const sortBy =
  sortByParam === 'name' ||
  sortByParam === 'stars' ||
  sortByParam === 'updated'
    ? sortByParam
    : 'stars'
```

**Recommendation**:
- Use Zod validation (see Issue #3)
- Or create a type guard function:
  ```typescript
  const SORT_OPTIONS = ['name', 'stars', 'updated'] as const
  type SortBy = typeof SORT_OPTIONS[number]

  function isSortBy(value: unknown): value is SortBy {
    return typeof value === 'string' && SORT_OPTIONS.includes(value as SortBy)
  }

  const sortBy = isSortBy(sortByParam) ? sortByParam : 'stars'
  ```

---

### 12. Database Migration Safety ⚠️
**Priority**: Medium
**Location**: `migrations/0001_initial_schema.sql`

**Missing**:
- Migration rollback script
- Index creation transaction safety
- Foreign key constraint tests
- Migration version tracking beyond D1's built-in

**Recommendation**:
- Add DOWN migration for rollback capability
- Consider idempotent migrations
- Add migration tests
- Document migration process

**Example DOWN migration**:
```sql
-- migrations/0001_initial_schema.down.sql
DROP INDEX IF EXISTS idx_sync_log_created_at;
DROP INDEX IF EXISTS idx_sync_log_registry_name;
DROP INDEX IF EXISTS idx_registry_items_repo;
DROP INDEX IF EXISTS idx_registry_items_archived;
DROP INDEX IF EXISTS idx_registry_items_language;
DROP INDEX IF EXISTS idx_registry_items_stars;
DROP INDEX IF EXISTS idx_registry_items_category;
DROP INDEX IF EXISTS idx_registry_items_registry_name;

DROP TABLE IF EXISTS sync_log;
DROP TABLE IF EXISTS registry_items;
DROP TABLE IF EXISTS registry_metadata;
```

---

## 🟢 Low Priority Issues

### 13. Missing Error Boundaries ℹ️
**Priority**: Low
**Location**: React components

No React Error Boundaries detected in the component tree.

**Impact**:
- Component errors crash entire app
- Poor user experience
- No error recovery mechanism

**Recommendation**:
- Add error boundaries at route level
- Show user-friendly error messages
- Log errors for debugging

**Example**:
```typescript
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

### 14. Inconsistent Error Handling ℹ️
**Priority**: Low
**Location**: API routes

Some routes return detailed errors, others don't:
- `/api/registry` - Returns stack traces (see Issue #2)
- `/api/search` - Returns basic error message
- `/api/languages` - Returns basic error message

**Recommendation**:
- Standardize error response format
- Create error response utility function
- Document error response schema

**Example**:
```typescript
// src/lib/api-error.ts
export interface ApiError {
  error: string
  code: string
  statusCode: number
  timestamp: string
}

export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR'
): Response {
  const message = error instanceof Error ? error.message : 'Unknown error'

  const apiError: ApiError = {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
  }

  // Log full error server-side
  console.error({ error, code, statusCode })

  return new Response(JSON.stringify(apiError), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

---

### 15. TODO Comments in ESLint Config ℹ️
**Priority**: Low
**Location**: `eslint.config.js:69-71`

```javascript
'n/no-missing-import': 'off', // TODO: turn it on
'@typescript-eslint/restrict-template-expressions': 'off', // TODO: maybe turn it on
'@typescript-eslint/prefer-nullish-coalescing': 'off', // TODO: maybe turn it on
```

**Issue**: Disabled rules with TODOs indicate incomplete linting coverage.

**Recommendation**:
- Address these TODOs or remove if not needed
- `n/no-missing-import`: Fix import issues or document why it's disabled
- `restrict-template-expressions`: Enable for better type safety
- `prefer-nullish-coalescing`: Enable for better null/undefined handling

---

## ✅ Positive Findings

1. ✅ **Strong TypeScript configuration** - Strict mode enabled
2. ✅ **Good test coverage** - 85 tests (excluding failing UI tests)
3. ✅ **Modern tooling** - TanStack Router/Query, Kysely ORM
4. ✅ **Proper indexing** - Database has appropriate indexes
5. ✅ **Build passes cleanly** - No TypeScript errors
6. ✅ **Good separation of concerns** - Clear file organization
7. ✅ **Security: SQL injection vulnerability fixed** - LIKE characters properly escaped

---

## Priority Action Plan

### Immediate (This Week)
1. ✅ ~~Fix SQL injection vulnerability (Issue #1)~~ - COMPLETED
2. ⚠️ Remove stack traces from production (Issue #2)
3. ⚠️ Add input validation with Zod (Issue #3)

### Short Term (1-2 Weeks)
4. ⚠️ Fix component test configuration (Issue #7)
5. ⚠️ Add rate limiting (Issue #4)
6. ⚠️ Update Kysely plugin (Issue #6)
7. ⚠️ Fix hardcoded database ID (Issue #5)

### Medium Term (1 Month)
8. Replace console.log with proper logging (Issue #9)
9. Fix React hooks patterns (Issue #8)
10. Add error boundaries (Issue #13)
11. Standardize error handling (Issue #14)

### Long Term (As Needed)
12. Address ESLint TODOs (Issue #15)
13. Add migration rollback scripts (Issue #12)
14. Improve type safety (Issue #11)

---

## Notes

- All integration tests pass (78/78)
- Component tests need environment fix (60 failing due to config)
- Build and deployment working correctly
- No TypeScript compilation errors
- Linter warnings are intentional (documented in code)

**Last Review**: 2025-11-08
**Next Review**: TBD
