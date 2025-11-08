# Enhansome Webapp

A searchable and filterable web UI for browsing curated awesome lists from the [enhansome-registry](https://github.com/v1nvn/enhansome-registry).

## Features

- 🔍 **Full-text search** across repository titles and descriptions
- 🎯 **Advanced filtering** by registry, language, stars, and archived status
- 💾 **D1 Database** - Registry data stored in Cloudflare D1 with automatic indexing
- 🔄 **Automated Sync** - Daily cron job to keep registry data up-to-date
- ⚡ **Fast performance** - Built with TanStack Start and React Query
- 🎨 **Beautiful UI** - Modern design with Tailwind CSS
- 📊 **Rich metadata** - Stars, languages, last commit dates, and more

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for D1 database and Workers)

### Installation

```bash
npm install
```

### Database Setup

1. Create a D1 database:
```bash
npx wrangler d1 create enhansome-registry
```

2. Update `wrangler.json` with your database ID:
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

3. Apply migrations:
```bash
npx wrangler d1 migrations apply enhansome-registry
```

4. Run the initial indexing:
```bash
npx wrangler deploy
npx wrangler triggers cron run
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Testing

Run the test suite:

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Building for Production

```bash
npm run build
npm run typecheck     # Type check before building
```

### Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

The scheduled indexer will automatically run daily at 6 AM UTC to sync registry data.

## Project Structure

```
src/
├── routes/
│   ├── index.tsx          # Homepage with registry overview
│   ├── registry.tsx       # Main browser with search/filter
│   └── api.registry.ts    # API route for fetching registry data
├── lib/
│   ├── db.ts              # Database queries with Kysely
│   └── indexer.ts         # Registry indexing logic
├── components/
│   └── Header.tsx         # Navigation header
├── types/
│   ├── registry.ts        # Registry data types
│   └── database.ts        # Database schema types
├── server.ts              # Scheduled worker for daily sync
└── styles.css             # Global styles

migrations/
└── 0001_initial_schema.sql # Database schema

tests/
├── unit/
│   └── indexer.test.ts    # Unit tests for indexer
├── integration/
│   ├── indexer.test.ts    # Integration tests for indexing
│   └── queries.test.ts    # Database query tests
├── fixtures/              # Test data
└── helpers/               # Test utilities
```

## How It Works

1. **Data Indexing**: A scheduled Cloudflare Worker runs daily at 6 AM UTC to fetch registry data from GitHub
2. **Database Storage**: Registry metadata and items are stored in Cloudflare D1 (SQLite) with full GitHub repository info
3. **Rich Queries**: Kysely ORM provides type-safe queries with filtering, sorting, and pagination
4. **Search & Filter**: Server-side search across titles, descriptions, and categories with instant results
5. **Routing**: TanStack Router provides type-safe navigation

## Available Registries

- **FFmpeg** - Tools and libraries for video/audio processing
- **Go** - Go programming language resources
- **MCP Servers** - Model Context Protocol servers
- **Self-hosted** - Self-hosted applications and services

## Tech Stack

### Frontend
- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons

### Backend
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless compute
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite database
- [Kysely](https://kysely.dev/) - Type-safe SQL query builder
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client

### Testing
- [Vitest](https://vitest.dev/) - Testing framework
- [@cloudflare/vitest-pool-workers](https://github.com/cloudflare/workers-sdk/tree/main/packages/vitest-pool-workers) - Workers environment for tests

### Development Tools
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [ESLint](https://eslint.org/) - Linting

## Database Schema

The D1 database uses three main tables:

- **registry_metadata** - Stores metadata about each registry (title, description, total items/stars)
- **registry_items** - Individual items from registries with GitHub repo information
- **sync_log** - Tracks sync operations and errors

See [migrations/0001_initial_schema.sql](migrations/0001_initial_schema.sql) for the complete schema.

## API Endpoints

### Query Functions (src/lib/db.ts)

- `getRegistryMetadata()` - Fetch all registry metadata
- `getRegistryData(registryName)` - Get full registry with items grouped by categories
- `getLanguages(registryName?)` - Get unique languages from repos
- `getRegistryStats(registryName)` - Get statistics for a registry
- `searchRegistryItems(params)` - Advanced search with filters, sorting, and pagination

## Development

### Linting & Formatting

```bash
npm run lint       # Check for linting errors
npm run check      # Lint and format in one command
```

## License

MIT
