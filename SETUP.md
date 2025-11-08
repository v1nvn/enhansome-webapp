# Enhansome Webapp - D1 Setup Guide

This webapp queries registry data from a Cloudflare D1 database. The database schema and data indexing are managed by the `enhansome-registry` repository.

## Architecture

```
┌──────────────────────────────────┐
│   enhansome-registry             │
│   (Schema Owner + Data Indexer)  │
├──────────────────────────────────┤
│  • Owns D1 migrations            │
│  • Runs daily indexing (5am UTC) │
│  • Manages schema changes        │
└────────────┬─────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│   Cloudflare D1 Database         │
│   enhansome-registry             │
├──────────────────────────────────┤
│  • registry_metadata (4 rows)    │
│  • registry_items (~2500 rows)   │
│  • sync_log (audit trail)        │
└────────────┬─────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│   enhansome-webapp               │
│   (Read-Only Consumer)           │
├──────────────────────────────────┤
│  • Queries D1 via Kysely         │
│  • No schema management          │
│  • API: GET /api/registry        │
└──────────────────────────────────┘
```

## Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Access to both `enhansome-webapp` and `enhansome-registry` repos

## Setup Steps

### 1. Create D1 Database (One Time)

**Note:** This is done ONCE and shared between both repos.

```bash
wrangler login
wrangler d1 create enhansome-registry
```

Output:
```
✅ Successfully created DB 'enhansome-registry'

[[d1_databases]]
binding = "DB"
database_name = "enhansome-registry"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Save the `database_id`** - you'll need it in both repos.

### 2. Configure enhansome-registry (Schema Owner)

In the `enhansome-registry` repo:

```bash
cd ../enhansome-registry

# Update wrangler.json with database_id
# Edit: wrangler.json

# Install dependencies
npm install

# Run migrations to create tables
npm run migrate

# Optionally index existing data
npm run index
```

For detailed registry setup, see `../enhansome-registry/README.md`

### 3. Configure enhansome-webapp (This Repo)

#### Update `wrangler.json`

Replace `REPLACE_WITH_DATABASE_ID` with your actual database ID:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "enhansome-registry",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

#### Install Dependencies

```bash
npm install
```

Dependencies include:
- `kysely` - Type-safe SQL query builder
- `kysely-d1` - Cloudflare D1 adapter
- `@cloudflare/workers-types` - TypeScript types

### 4. Test Locally

#### Start Dev Server

```bash
npm run dev
```

Wrangler will create a local D1 database at `.wrangler/state/v3/d1/`

#### Query Local Database

```bash
# Open interactive SQL shell
npm run db:shell

# Run queries:
# SELECT * FROM registry_metadata;
# SELECT COUNT(*) FROM registry_items;
# SELECT * FROM registry_items WHERE stars > 1000 LIMIT 10;
```

#### Test API Endpoint

```bash
# In another terminal
curl http://localhost:3000/api/registry
```

### 5. Deploy to Production

```bash
# Deploy webapp
npm run deploy

# Verify production
curl https://your-domain.com/api/registry
```

## Database Schema

The schema is defined and managed in `enhansome-registry/migrations/`

### Tables

**registry_metadata**
- `registry_name` (PK) - e.g., "go", "selfhosted"
- `title` - Display name
- `description` - Description text
- `last_updated` - ISO timestamp
- `source_repository` - GitHub repo
- `total_items`, `total_stars` - Aggregated stats

**registry_items**
- `id` (PK) - Auto-increment
- `registry_name` - Foreign key
- `category` - Section name
- `title`, `description` - Item details
- `repo_owner`, `repo_name` - GitHub info
- `stars`, `language`, `last_commit` - Repo metadata
- `archived` - Boolean (0/1)

**sync_log**
- Tracks indexing operations
- Used for debugging and monitoring

### Indexes

Performance indexes on:
- `registry_name`, `category`, `stars`, `language`, `archived`
- `repo_owner` + `repo_name`

## API Endpoints

### GET /api/registry

Returns all registries with their full data structure.

**Response:**
```json
[
  {
    "name": "go",
    "data": {
      "metadata": {
        "title": "Awesome Go",
        "source_repository": "avelino/awesome-go",
        "last_updated": "2025-10-11T..."
      },
      "items": [
        {
          "title": "Actor Model",
          "description": "...",
          "items": [...]
        }
      ]
    }
  }
]
```

**Caching:** 1 hour (`Cache-Control: public, max-age=3600`)

## Development

### Query Database Helper Functions

Located in `src/lib/db.ts`:

- `getRegistryMetadata(db)` - List all registries
- `getRegistryData(db, name)` - Get full registry data
- `getLanguages(db, name?)` - Get unique languages
- `getRegistryStats(db, name)` - Get aggregate stats
- `searchRegistryItems(db, params)` - Search with filters

### Type Safety

All database queries are type-safe using Kysely:

```typescript
import { createKysely } from '@/lib/db'

const db = createKysely(env.DB)

// Full IDE autocomplete and type checking
const items = await db
  .selectFrom('registry_items')
  .select(['title', 'stars'])
  .where('registry_name', '=', 'go')
  .where('stars', '>', 1000)
  .execute()
```

### Database Types

Located in `src/types/database.ts`, copied from `enhansome-registry` to ensure compatibility.

**Important:** If the registry repo changes the schema, copy the updated types here.

## Troubleshooting

### "D1 database not configured"

- Check `wrangler.json` has correct `database_id`
- Verify database exists: `wrangler d1 list`
- Ensure migrations ran: `cd ../enhansome-registry && npm run migrate`

### Empty results from API

- Check registry repo indexed data: `cd ../enhansome-registry && npm run index`
- Query database: `npm run db:shell` then `SELECT COUNT(*) FROM registry_items;`

### Type errors in db.ts

- Ensure `src/types/database.ts` matches registry schema
- Run `npm run lint` to check for issues

### Local database not working

- Delete `.wrangler/` folder and restart: `rm -rf .wrangler && npm run dev`
- Check Wrangler version: `wrangler --version` (should be >= 3.0)

## Common Tasks

### Query Production Database

```bash
npm run db:shell:remote

# Then run queries
SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 5;
```

### Check Indexing Status

```bash
npm run db:shell:remote

SELECT
  registry_name,
  status,
  items_synced,
  created_at
FROM sync_log
ORDER BY created_at DESC
LIMIT 10;
```

### View Registry Stats

```bash
npm run db:shell:remote

SELECT
  registry_name,
  total_items,
  total_stars,
  last_updated
FROM registry_metadata;
```

## Key Differences from enhansome-registry

| enhansome-registry | enhansome-webapp |
|-------------------|------------------|
| Owns migrations | No migrations |
| Writes to D1 | Read-only |
| Uses Kysely REST API | Uses D1 binding |
| Indexes data daily | Queries data on-demand |
| `src/index.ts` (indexer) | `src/routes/api.registry.ts` (API) |

## Resources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Kysely Documentation](https://kysely.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Registry Repo: `../enhansome-registry/README.md`

## Cost

**Cloudflare D1 Free Tier:**
- 5 GB storage (using < 10 MB)
- 5 million reads/day (estimated < 5k)
- 100k writes/day (webapp does 0 writes)

**Total cost: $0/month** ✅
