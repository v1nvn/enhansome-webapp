# Enhansome Webapp

A searchable and filterable web UI for browsing curated awesome lists from the [enhansome-registry](https://github.com/v1nvn/enhansome-registry).

## Features

- 🔍 **Full-text search** across repository titles and descriptions
- 🎯 **Advanced filtering** by registry, language, stars, and archived status
- 💾 **Smart caching** - Registry data cached for 24 hours
- ⚡ **Fast performance** - Built with TanStack Start and React Query
- 🎨 **Beautiful UI** - Modern design with Tailwind CSS
- 📊 **Rich metadata** - Stars, languages, last commit dates, and more

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
```

### Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

## Project Structure

```
src/
├── routes/
│   ├── index.tsx          # Homepage with registry overview
│   ├── registry.tsx       # Main browser with search/filter
│   └── api.registry.ts    # API route for fetching registry data
├── components/
│   └── Header.tsx         # Navigation header
├── types/
│   └── registry.ts        # TypeScript types
└── styles.css            # Global styles
```

## How It Works

1. **Data Fetching**: On startup, the app fetches all JSON files from the enhansome-registry GitHub repository
2. **Caching**: Registry data is cached in-memory for 24 hours to minimize API calls
3. **Search & Filter**: Client-side filtering provides instant results as you type
4. **Routing**: TanStack Router provides type-safe navigation

## Available Registries

- **FFmpeg** - Tools and libraries for video/audio processing
- **Go** - Go programming language resources
- **MCP Servers** - Model Context Protocol servers
- **Self-hosted** - Self-hosted applications and services

## Tech Stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Development

### Linting & Formatting

```bash
npm run lint       # Check for linting errors
npm run format     # Format code with Prettier
npm run check      # Lint and format in one command
```

### Testing

```bash
npm run test
```

## License

MIT
