# Redesign Front Page & Registry Pages for Large Datasets

**Created:** 2025-02-18
**Status:** In Progress (Phase 3 Complete)

## Progress

- [x] Phase 1: Database & API Foundation
  - [x] Migration file `/migrations/0003_featured_registries.sql` created
  - [x] Database query functions added to `/src/lib/db.ts`
  - [x] Server functions added to `/src/lib/server-functions.ts`
  - [x] Tests added for new database functions in `tests/integration/db.test.ts`
  - [x] Tests added for new server functions in `tests/integration/server-functions.test.ts`
- [x] Phase 2: Home Page Redesign
  - [x] Created `/src/components/home/FeaturedSection.tsx` - 6-8 hand-picked gems with badges
  - [x] Created `/src/components/home/TrendingSection.tsx` - Rising stars with horizontal scroll
  - [x] Created `/src/components/home/QuickFilterPills.tsx` - Language and category filter pills
  - [x] Created `/src/components/home/CategoryExplorer.tsx` - Top categories by count
  - [x] Created `/src/components/home/HeroSearch.tsx` - Full-width search with autocomplete
  - [x] Modified `/src/routes/index.tsx` - New layout with hero, featured, trending, filters, categories
  - [x] Created `/src/components/RegistriesBrowser.tsx` - Browse all registries with grouping
  - [x] Created `/src/routes/registries.tsx` - Dedicated page for all registries
- [x] Phase 3: Registry Browser Enhancements
  - [x] Created `/src/lib/registry-groups.ts` - Registry grouping configuration
  - [x] Modified `/src/components/FiltersSidebar.tsx` - Hierarchical grouping with collapse/expand
  - [x] Modified `/src/components/FiltersBottomSheet.tsx` - Hierarchical grouping on mobile
  - [x] Created `/src/components/FacetedSearchBar.tsx` - Enhanced search bar with presets
  - [x] Modified `/src/routes/registry.tsx` - Integrated FacetedSearchBar
- [ ] Phase 4: Detail Pages
- [ ] Phase 5: Performance Optimization

---

## Context

The application has grown to 250 registries and 20,000 repositories. The current design issues:

1. **Home page** renders all 250 registry cards simultaneously (flat grid, no hierarchy)
2. **No curated discovery** - all registries treated equally
3. **No detailed views** - users can't dive into specific registries or repositories
4. **Search is basic** - LIKE queries don't scale well

**Goal:** Transform from flat list to a curated discovery platform while maintaining powerful search.

---

## Design Philosophy

**"Curated Discovery over Infinite Scroll"** - like a high-end magazine with featured content, organized sections, and comprehensive search.

**Existing Design System (reuse this):**
- Display Font: Playfair Display (editorial feel)
- Body Font: DM Sans
- Color Palette: Terracotta primary, Navy secondary, Warm Peach accent
- Typography: Hero (72px) → Section (36px) → Card (24px) → Body (16px)
- Animations: Staggered reveals, hover effects (-translate-y-1 + shadow-xl)

---

## Phase 1: Database & API Foundation

### Tasks

1. **Create migration file** `/migrations/0003_featured_registries.sql`
2. **Add database query functions** to `/src/lib/db.ts`
3. **Add server functions** to `/src/lib/server-functions.ts`

### 1.1 Database Migration

**New file:** `/migrations/0003_featured_registries.sql`

```sql
-- Featured registries for editorial curation
CREATE TABLE IF NOT EXISTS registry_featured (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registry_name TEXT NOT NULL UNIQUE,
  featured INTEGER DEFAULT 1,
  featured_order INTEGER,
  editorial_badge TEXT, -- 'editors-choice', 'trending', 'new'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registry_name) REFERENCES registry_metadata(registry_name)
);

CREATE INDEX IF NOT EXISTS idx_registry_featured_order
  ON registry_featured(featured, featured_order);
```

### 1.2 Add Database Queries

**Modify:** `/src/lib/db.ts`

Add functions:
- `getFeaturedRegistries(db)` - Fetch featured with order and badges
- `getTrendingRegistries(db)` - Calculate star velocity, return top 12
- `getCategorySummaries(db)` - Aggregate categories with counts
- `getRegistryDetail(db, name)` - Metadata + top repos + categories + stats
- `getRepoDetail(db, owner, name)` - Repo info + related repos

### 1.3 Add Server Functions

**Modify:** `/src/lib/server-functions.ts`

Add query options:
```typescript
export const featuredQueryOptions = () => queryOptions({...})
export const trendingQueryOptions = () => queryOptions({...})
export const categorySummariesQueryOptions = () => queryOptions({...})
export const registryDetailQueryOptions = (name: string) => queryOptions({...})
export const repoDetailQueryOptions = (owner: string, name: string) => queryOptions({...})
```

### Phase 1 Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Run tests (if any exist for db/server-functions)
npm test
```

**Manual checks:**
- Migration file is valid SQL
- TypeScript types align with database schema
- Query options follow existing patterns in `server-functions.ts`

---

## Phase 2: Home Page Redesign

### Tasks

1. **Create home components** (FeaturedSection, TrendingSection, QuickFilterPills, CategoryExplorer, HeroSearch)
2. **Modify home page** to use new layout
3. **Create browse all registries page** and component

### 2.1 New Home Components

**Create:** `/src/components/home/FeaturedSection.tsx`
- 6-8 manually selected registries
- Larger cards with descriptions
- Badge system: "Editor's Choice", "Most Popular", "New"
- Asymmetrical grid (2 large + 4-6 small)

**Create:** `/src/components/home/TrendingSection.tsx`
- Horizontal scroll with snap points
- Compact cards with growth metrics
- Shows "↑ X stars this week" badges

**Create:** `/src/components/home/QuickFilterPills.tsx`
- Language pills: JavaScript, TypeScript, Python, Rust, Go
- Category pills: Web Dev, DevOps, ML, Mobile
- Clicking navigates to `/registry` with pre-applied filters

**Create:** `/src/components/home/CategoryExplorer.tsx`
- Top 8-10 categories by repository count
- Card-based layout with count badges

**Create:** `/src/components/home/HeroSearch.tsx`
- Full-width search in hero
- Autocomplete suggestions (registries + categories)
- Recent searches (localStorage)

### 2.2 Modify Home Page

**Modify:** `/src/routes/index.tsx`

New layout structure:
```
┌─────────────────────────────────────────────┐
│  [HERO] - Value Prop + HeroSearch          │
├─────────────────────────────────────────────┤
│  [FEATURED] - 6-8 hand-picked gems        │
├─────────────────────────────────────────────┤
│  [TRENDING] - Rising stars (horizontal)   │
├─────────────────────────────────────────────┤
│  [QUICK FILTER PILLS] - Language/Category │
├─────────────────────────────────────────────┤
│  [CATEGORY EXPLORER] - Top categories     │
└─────────────────────────────────────────────┘
```

Remove the flat grid of all 250 registries.

### 2.3 New Browse All Registries Page

**Create:** `/src/routes/registries.tsx`
- Dedicated page to browse all 250 registries
- Group by ecosystem or language
- Search within groups

**Create:** `/src/components/RegistriesBrowser.tsx`
- Virtualized list of registries
- Grouped by ecosystem/domain
- Shows stats (repos, stars, languages)

### Phase 2 Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

**Manual checks:**
- Home page loads without rendering all 250 registries
- Featured section displays (when data exists)
- Trending section displays
- Quick filters navigate to `/registry` with correct filters
- Category explorer shows categories
- Browse all registries link works
- Mobile responsive

---

## Phase 3: Registry Browser Enhancements

### Tasks

1. **Modify FiltersSidebar** with hierarchical grouping
2. **Create FacetedSearchBar** component
3. **Integrate into existing registry browser**

### 3.1 Update Filters Sidebar

**Modify:** `/src/components/FiltersSidebar.tsx`

Add hierarchical grouping:
- "JavaScript Ecosystem" (12 registries)
- "Python Ecosystem" (8 registries)
- "DevOps & Infrastructure" (15 registries)
- "Languages" (25 registries)
- "Other" (remaining)

Features:
- Collapse/expand groups
- Show counts per group
- Search within groups

### 3.2 Faceted Search Bar

**Create:** `/src/components/FacetedSearchBar.tsx`
- Combines search input + active filters
- Selected filters as removable chips
- Active filters count indicator
- One-click presets:
  - "🔥 Trending This Week"
  - "⭐ 1000+ Stars"
  - "🆕 Recently Updated"
  - "📢 Actively Maintained"

### 3.3 Integration

**Modify:** `/src/routes/registry.tsx`

Replace existing SearchBar with FacetedSearchBar if desired, or keep both options.

### Phase 3 Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint
```

**Manual checks:**
- Registry dropdown shows grouped registries
- Groups can be collapsed/expanded
- Search within groups works
- Faceted search bar shows active filters
- Filter presets work correctly
- Mobile bottom sheet still works

---

## Phase 4: Detail Pages

### Tasks

1. **Create registry detail page** route and component
2. **Create repository detail page** route and component
3. **Add navigation** from existing pages to detail pages

### 4.1 Registry Detail Page

**Create:** `/src/routes/registry.$name.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│  Awesome React                          │
│  Curated list of React libraries & tools│
│  ⭐ 45,234 total stars across 892 repos│
├─────────────────────────────────────────┤
│  [TABS]                                │
│  ○ Top Repos | ○ Categories | ○ Stats │
├─────────────────────────────────────────┤
│  [TOP REPOS]                           │
│  ┌──────────────────────────────────┐  │
│  │ 1. React (228k stars)           │  │
│  │    A JavaScript library for...  │  │
│  │    JavaScript • Updated 2d ago  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Create:** `/src/components/RegistryDetail.tsx` - Main detail component with tabs

### 4.2 Repository Detail Page

**Create:** `/src/routes/repo.$owner.$name.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│  [BACK]                                │
│  facebook / react                      │
│  ⭐ 228,342 stars | 🍴 46,891 forks │
├─────────────────────────────────────────┤
│  A JavaScript library for building...  │
│  [View on GitHub]                     │
├─────────────────────────────────────────┤
│  [RELATED REPOS]                       │
│  Also in "Web Frameworks"             │
└─────────────────────────────────────────┘
```

**Note:** External stats (GitHub API) fetched client-side only.

**Create:** `/src/components/RepoDetail.tsx` - Main detail component

### 4.3 Add Navigation Links

**Modify:** Existing components to link to detail pages:
- Home page registry cards → `/registry/{name}`
- Registry browser repo cards → `/repo/{owner}/{name}`

### Phase 4 Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

**Manual checks:**
- Registry detail page loads for valid registry names
- Registry detail shows top repos tab
- Registry detail shows categories tab
- Registry detail shows stats tab
- Repo detail page loads for valid owner/name
- Repo detail shows related repos
- Back button works on repo detail
- Links from home/browser go to detail pages

---

## Phase 5: Performance Optimization

### Tasks

1. **Create database indexes migration**
2. **Add KV namespace binding** to wrangler.toml
3. **Optional: FlexSearch integration**

### 5.1 Database Indexes

**New file:** `/migrations/0004_performance_indexes.sql`

```sql
-- Compound index for registry browser queries
CREATE INDEX IF NOT EXISTS idx_registry_items_browse ON registry_items(
  registry_name,
  category,
  stars DESC,
  archived
);

-- Search support
CREATE INDEX IF NOT EXISTS idx_registry_items_search ON registry_items(
  registry_name,
  title COLLATE NOCASE,
  description COLLATE NOCASE
);

-- Trending calculation
CREATE INDEX IF NOT EXISTS idx_registry_metadata_velocity ON registry_metadata(
  total_stars DESC,
  last_updated DESC
);

-- Category grouping performance
CREATE INDEX IF NOT EXISTS idx_registry_items_category_stats ON registry_items(
  registry_name,
  category,
  language
);
```

### 5.2 KV Namespace Binding

**Modify:** `wrangler.toml`

Add KV binding for search index caching (optional, for FlexSearch):
```toml
[[kv_namespaces]]
binding = "INDEX_KV"
id = "..."
```

### 5.3 FlexSearch Integration (Optional)

**Create:** `/src/lib/search-index.ts`

For faster full-text search than LIKE queries:
- Build index from registry items
- Store in KV cache (24-hour TTL)
- Rebuild on registry updates

### Phase 5 Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

**Manual checks:**
- Database migration applies successfully
- KV binding is configured (if using FlexSearch)
- Search performance is acceptable with 20K items

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `/migrations/0003_featured_registries.sql` | Featured registries table |
| `/migrations/0004_performance_indexes.sql` | Performance indexes |
| `/src/components/home/FeaturedSection.tsx` | Editor's picks section |
| `/src/components/home/TrendingSection.tsx` | Rising stars section |
| `/src/components/home/QuickFilterPills.tsx` | Quick filter pills |
| `/src/components/home/CategoryExplorer.tsx` | Category cards |
| `/src/components/home/HeroSearch.tsx` | Hero search with autocomplete |
| `/src/components/RegistriesBrowser.tsx` | Browse all registries |
| `/src/components/FacetedSearchBar.tsx` | Enhanced search bar |
| `/src/components/RegistryDetail.tsx` | Registry detail component |
| `/src/components/RepoDetail.tsx` | Repository detail component |
| `/src/routes/registries.tsx` | Browse all registries route |
| `/src/routes/registry.$name.tsx` | Registry detail route |
| `/src/routes/repo.$owner.$name.tsx` | Repository detail route |
| `/src/lib/search-index.ts` | FlexSearch integration (optional) |

### Files to Modify

| File | Changes |
|------|---------|
| `/src/lib/db.ts` | Add query functions |
| `/src/lib/server-functions.ts` | Add query options |
| `/src/routes/index.tsx` | Redesign home page |
| `/src/components/FiltersSidebar.tsx` | Add hierarchical grouping |
| `wrangler.toml` | Add KV binding (optional) |

---

## Overall Verification

### Final Testing Commands
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test

# Build
npm run build
```

### End-to-End Checklist
- [ ] Home page doesn't render all 250 registries at once
- [ ] Featured section displays (when data exists)
- [ ] Trending section shows rising stars
- [ ] Quick filters navigate with correct params
- [ ] Category explorer shows top categories
- [ ] Browse all registries page works
- [ ] Registry filters are grouped hierarchically
- [ ] Faceted search bar shows active filters
- [ ] Registry detail page loads with tabs
- [ ] Repository detail page shows related repos
- [ ] All pages are mobile responsive
- [ ] Database migrations apply successfully
- [ ] Lint passes with no errors
- [ ] Type check passes
- [ ] Build succeeds
