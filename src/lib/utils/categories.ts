/**
 * Category utilities
 * Consolidates category normalization, matching, and use case categories
 */

import {
  generateSlug,
  normalizeSpecialChars,
  pluralize,
  removeEmojis,
} from './strings'

import type { D1Database } from '@cloudflare/workers-types'

// ============================================================================
// Types
// ============================================================================

export interface NormalizedCategory {
  name: string
  slug: string
}

export interface UseCaseCategory {
  count?: number
  description: string
  icon: string
  id: string
  keywords: string[]
  subcategories?: {
    count: number
    id: string
    title: string
  }[]
  title: string
}

export interface UseCaseCategoryWithCount {
  count: number
  description: string
  icon: string
  id: string
  title: string
}

// ============================================================================
// Use Case Categories Configuration
// ============================================================================

const USE_CASE_CATEGORIES: Omit<UseCaseCategory, 'subcategories'>[] = [
  {
    id: 'charts-visualization',
    title: 'Charts & Visualization',
    description:
      'Libraries for rendering charts, graphs, and data visualizations',
    icon: 'bar-chart',
    keywords: [
      'chart',
      'graph',
      'visualization',
      'plot',
      'diagram',
      'd3',
      'recharts',
      'chartjs',
      'nivo',
      'vis',
      'plotly',
      'highcharts',
      'echarts',
      'victory',
      'observable',
    ],
  },
  {
    id: 'state-management',
    title: 'State Management',
    description: 'Tools for managing application state and data flow',
    icon: 'database',
    keywords: [
      'state',
      'store',
      'redux',
      'mobx',
      'zustand',
      'recoil',
      'jotai',
      'valtio',
      'flux',
      'vuex',
      'pinia',
      'effector',
      'signal',
      'react-query',
      'swr',
    ],
  },
  {
    id: 'api-clients',
    title: 'API Clients',
    description: 'HTTP clients, API wrappers, and data fetching libraries',
    icon: 'globe',
    keywords: [
      'api',
      'http',
      'fetch',
      'axios',
      'ky',
      'got',
      'superagent',
      'request',
      'graphql',
      'gql',
      'rest',
      'openapi',
      'swagger',
      'grpc',
      'soap',
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    description: 'Testing frameworks, assertion libraries, and test utilities',
    icon: 'flask-conical',
    keywords: [
      'test',
      'testing',
      'jest',
      'vitest',
      'mocha',
      'jasmine',
      'karma',
      'chai',
      'assert',
      'cypress',
      'playwright',
      'selenium',
      'puppeteer',
      'msw',
      'testing-library',
      'mock',
      'stub',
      'spy',
    ],
  },
  {
    id: 'ui-components',
    title: 'UI Components',
    description: 'Component libraries and UI toolkits',
    icon: 'layout',
    keywords: [
      'component',
      'ui kit',
      'design system',
      'material',
      'ant',
      'chakra',
      'mantine',
      'shadcn',
      'radix',
      'headless',
      'daisy',
      'tailwind',
      'bootstrap',
      'bulma',
      'element',
      'prime',
      'vuetify',
    ],
  },
  {
    id: 'build-tools',
    title: 'Build Tools',
    description: 'Bundlers, compilers, and development tooling',
    icon: 'wrench',
    keywords: [
      'build',
      'bundle',
      'bundler',
      'webpack',
      'vite',
      'rollup',
      'esbuild',
      'parcel',
      'browserify',
      'babel',
      'swc',
      'turbopack',
      'rspack',
      'compiler',
      'transpiler',
    ],
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'Auth libraries, identity management, and session handling',
    icon: 'lock',
    keywords: [
      'auth',
      'authentication',
      'oauth',
      'jwt',
      'passport',
      'next-auth',
      'clerk',
      'auth0',
      'supabase',
      'firebase',
      'identity',
      'login',
      'session',
      'token',
      'sso',
      'ldap',
    ],
  },
  {
    id: 'mobile-development',
    title: 'Mobile Development',
    description: 'Cross-platform and native mobile development frameworks',
    icon: 'smartphone',
    keywords: [
      'mobile',
      'react native',
      'flutter',
      'ionic',
      'capacitor',
      'cordova',
      'expo',
      'native',
      'android',
      'ios',
      'swift',
      'kotlin',
      'dart',
    ],
  },
  {
    id: 'database',
    title: 'Database & ORM',
    description: 'Database clients, ORMs, and query builders',
    icon: 'database',
    keywords: [
      'database',
      'orm',
      'sql',
      'nosql',
      'prisma',
      'drizzle',
      'typeorm',
      'sequelize',
      'mongoose',
      'knex',
      'qb',
      'query builder',
      'postgres',
      'mysql',
      'mongodb',
      'redis',
      'sqlite',
    ],
  },
  {
    id: 'forms',
    title: 'Forms & Validation',
    description: 'Form handling, validation, and input management',
    icon: 'file-input',
    keywords: [
      'form',
      'validation',
      'react-hook-form',
      'formik',
      'yup',
      'zod',
      'joi',
      'validator',
      'input',
      'field',
      'schema',
    ],
  },
  {
    id: 'date-time',
    title: 'Date & Time',
    description: 'Date manipulation, formatting, and timezone utilities',
    icon: 'calendar',
    keywords: [
      'date',
      'time',
      'moment',
      'date-fns',
      'dayjs',
      'luxon',
      'timezone',
      'calendar',
      'datetime',
      'formatting',
    ],
  },
  {
    id: 'animation',
    title: 'Animation',
    description: 'Animation libraries and motion design tools',
    icon: 'sparkles',
    keywords: [
      'animation',
      'animate',
      'framer',
      'motion',
      'gsap',
      'anime',
      'lottie',
      'react-spring',
      'auto-animate',
      'transition',
    ],
  },
]

// ============================================================================
// Category Normalization
// ============================================================================

const CATEGORY_MAPPINGS: Record<string, string> = {
  // Framework categories
  'web-framework': 'Web Frameworks',
  'web frameworks': 'Web Frameworks',
  'web framework': 'Web Frameworks',
  'frontend framework': 'Frontend Frameworks',
  'frontend frameworks': 'Frontend Frameworks',
  'ui framework': 'UI Frameworks',
  'ui frameworks': 'UI Frameworks',
  'component library': 'Component Libraries',
  'component libraries': 'Component Libraries',

  // Backend categories
  backend: 'Backend',
  'back-end': 'Backend',
  server: 'Server',
  api: 'APIs',
  apis: 'APIs',
  'rest api': 'REST APIs',
  graphql: 'GraphQL',

  // Database categories
  database: 'Databases',
  databases: 'Databases',
  db: 'Databases',
  orm: 'ORMs',
  orms: 'ORMs',
  sql: 'SQL',
  nosql: 'NoSQL',

  // Tool categories
  tool: 'Tools',
  tools: 'Tools',
  'developer tool': 'Developer Tools',
  'developer tools': 'Developer Tools',
  devtools: 'Developer Tools',
  cli: 'CLI Tools',
  'command line': 'CLI Tools',
  'command-line': 'CLI Tools',

  // Testing categories
  testing: 'Testing',
  test: 'Testing',
  'testing framework': 'Testing Frameworks',
  'testing frameworks': 'Testing Frameworks',
  'test runner': 'Test Runners',

  // Build/bundling
  bundler: 'Bundlers',
  bundlers: 'Bundlers',
  'build tool': 'Build Tools',
  'build tools': 'Build Tools',
  compiler: 'Compilers',
  transpiler: 'Transpilers',

  // Styling categories
  css: 'CSS',
  styling: 'Styling',
  stylesheet: 'Stylesheets',
  'css-in-js': 'CSS-in-JS',
  tailwind: 'Tailwind CSS',

  // State management
  'state management': 'State Management',
  state: 'State Management',
  store: 'State Management',

  // DevOps categories
  devops: 'DevOps',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
  logging: 'Logging',

  // Security
  security: 'Security',
  auth: 'Authentication',
  authentication: 'Authentication',
  authorization: 'Authorization',
  encryption: 'Encryption',

  // Performance
  performance: 'Performance',
  optimization: 'Optimization',
  caching: 'Caching',

  // Documentation
  documentation: 'Documentation',
  docs: 'Documentation',
  doc: 'Documentation',

  // Utility libraries
  utility: 'Utilities',
  utilities: 'Utilities',
  helper: 'Helpers',
  helpers: 'Helpers',
  lib: 'Libraries',
  library: 'Libraries',

  // Data processing
  data: 'Data',
  validation: 'Validation',
  parser: 'Parsers',
  parsers: 'Parsers',
  formatter: 'Formatters',
  formatters: 'Formatters',

  // HTTP/networking
  http: 'HTTP',
  networking: 'Networking',
  websocket: 'WebSockets',
  fetch: 'Fetch',
  axios: 'HTTP Clients',
  request: 'HTTP Clients',

  // File handling
  file: 'File Handling',
  upload: 'File Upload',
  storage: 'Storage',

  // UI components
  form: 'Forms',
  forms: 'Forms',
  table: 'Tables',
  tables: 'Tables',
  grid: 'Grids',
  charts: 'Charts',
  chart: 'Charts',
  graph: 'Charts',
  modal: 'Modals',
  dialog: 'Modals',
  notification: 'Notifications',
  toast: 'Notifications',

  // Animation
  animation: 'Animation',
  animations: 'Animation',
  transition: 'Transitions',
  motion: 'Animation',

  // Date/time
  date: 'Date & Time',
  time: 'Date & Time',
  datetime: 'Date & Time',
  calendar: 'Calendars',
  scheduler: 'Scheduling',

  // Internationalization
  i18n: 'Internationalization',
  internationalization: 'Internationalization',
  localization: 'Localization',
  l10n: 'Localization',
  translation: 'Translations',

  // Image processing
  image: 'Images',
  images: 'Images',
  img: 'Images',
  video: 'Video',
  audio: 'Audio',
  media: 'Media',

  // Authentication/authorization specific
  oauth: 'OAuth',
  jwt: 'JWT',
  passport: 'Passport',
  session: 'Sessions',

  // Node.js specific
  node: 'Node.js',
  nodejs: 'Node.js',
  express: 'Express',
  koa: 'Koa',
  fastify: 'Fastify',
  nest: 'NestJS',

  // React ecosystem
  react: 'React',
  next: 'Next.js',
  nextjs: 'Next.js',
  gatsby: 'Gatsby',
  remix: 'Remix',

  // Vue ecosystem
  vue: 'Vue',
  nuxt: 'Nuxt',
  nuxtjs: 'Nuxt',

  // Other frameworks
  angular: 'Angular',
  svelte: 'Svelte',
  sveltekit: 'SvelteKit',
  solid: 'SolidJS',
  qwik: 'Qwik',

  // Mobile
  mobile: 'Mobile',
  ios: 'iOS',
  android: 'Android',
  'react native': 'React Native',
  'react-native': 'React Native',
  flutter: 'Flutter',

  // Desktop
  desktop: 'Desktop',
  electron: 'Electron',
  tauri: 'Tauri',

  // CMS
  cms: 'CMS',
  'headless cms': 'Headless CMS',
  'content management': 'CMS',

  // E-commerce
  ecommerce: 'E-commerce',
  'e-commerce': 'E-commerce',
  payment: 'Payments',
  payments: 'Payments',
  stripe: 'Stripe',

  // AI/ML
  ai: 'AI',
  ml: 'Machine Learning',
  'machine learning': 'Machine Learning',
  llm: 'LLMs',
  openai: 'OpenAI',
  chatgpt: 'ChatGPT',

  // Blockchain
  blockchain: 'Blockchain',
  crypto: 'Cryptocurrency',
  web3: 'Web3',
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin',
  nft: 'NFTs',

  // Game development
  game: 'Game Development',
  games: 'Game Development',
  gaming: 'Game Development',
  unity: 'Unity',
  unreal: 'Unreal',

  // Design
  design: 'Design',
  'design system': 'Design Systems',
  figma: 'Figma',
  icon: 'Icons',
  icons: 'Icons',

  // Dev experience
  ide: 'IDEs',
  editor: 'Editors',
  vscode: 'VS Code',
  extension: 'Extensions',

  // Misc common terms
  boilerplate: 'Boilerplates',
  template: 'Templates',
  starter: 'Starters',
  scaffold: 'Scaffolding',
  generator: 'Generators',
  plugin: 'Plugins',
  middleware: 'Middleware',
  adapter: 'Adapters',
  wrapper: 'Wrappers',
  sdk: 'SDKs',
  'api wrapper': 'API Wrappers',
}

const SYNONYM_GROUPS: Record<string, string[]> = {
  'Web Frameworks': ['web', 'frontend', 'client-side'],
  Backend: ['server', 'backend', 'api', 'serverside'],
  'Developer Tools': ['devtools', 'tooling', 'development'],
  Testing: ['test', 'testing', 'spec'],
  'Build Tools': ['build', 'compile', 'bundle', 'transpile'],
  Styling: ['css', 'style', 'sass', 'less'],
}

/**
 * Map items to use case categories based on keywords
 */
export function categorizeItem(
  title: string,
  description: null | string,
  category: string,
): string[] {
  const searchText = `${title} ${description || ''} ${category}`.toLowerCase()
  const matchedCategories: string[] = []

  for (const useCase of USE_CASE_CATEGORIES) {
    const hasMatch = useCase.keywords.some(keyword =>
      searchText.includes(keyword.toLowerCase()),
    )
    if (hasMatch) {
      matchedCategories.push(useCase.id)
    }
  }

  return matchedCategories
}

/**
 * Get all categories from database
 */
export async function getAllCategories(db: D1Database): Promise<
  {
    id: number
    name: string
    slug: string
  }[]
> {
  const results = await db
    .prepare('SELECT id, name, slug FROM categories ORDER BY name')
    .all<{ id: number; name: string; slug: string }>()

  return results.results
}

// ============================================================================
// Use Case Category Functions
// ============================================================================

/**
 * Get all use case categories
 */
export function getAllUseCaseCategories(): UseCaseCategory[] {
  return USE_CASE_CATEGORIES
}

/**
 * Get category by ID
 */
export async function getCategoryById(
  db: D1Database,
  id: number,
): Promise<null | {
  id: number
  name: string
  slug: string
}> {
  const result = await db
    .prepare('SELECT id, name, slug FROM categories WHERE id = ?')
    .bind(id)
    .first<{ id: number; name: string; slug: string }>()

  return result
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(
  db: D1Database,
  slug: string,
): Promise<null | {
  id: number
  name: string
  slug: string
}> {
  const result = await db
    .prepare('SELECT id, name, slug FROM categories WHERE slug = ?')
    .bind(slug)
    .first<{ id: number; name: string; slug: string }>()

  return result
}

// ============================================================================
// Database Category Functions
// ============================================================================

/**
 * Get or create a category by its normalized name
 */
export async function getOrCreateCategory(
  db: D1Database,
  name: string,
): Promise<number> {
  const { name: normalizedName, slug } = normalizeCategoryName(name)

  const existing = await db
    .prepare('SELECT id FROM categories WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>()

  if (existing) {
    return existing.id
  }

  const result = await db
    .prepare('INSERT INTO categories (slug, name) VALUES (?, ?)')
    .bind(slug, normalizedName)
    .run()

  return result.meta.last_row_id
}

/**
 * Get use case category by ID
 */
export function getUseCaseCategoryById(
  id: string,
): undefined | UseCaseCategory {
  return USE_CASE_CATEGORIES.find(cat => cat.id === id)
}

/**
 * Clean and normalize a category name
 */
export function normalizeCategoryName(raw: string): NormalizedCategory {
  // Stage 1: Basic cleanup
  let cleaned = raw.trim()

  // Stage 2: Remove emojis and special Unicode
  cleaned = removeEmojis(cleaned)

  // Stage 3: Normalize special characters
  cleaned = normalizeSpecialChars(cleaned)

  // Stage 4: Remove common prefixes/suffixes and noise
  cleaned = cleaned
    .replace(/^for\s+/i, '')
    .replace(/^with\s+/i, '')
    .replace(/^using\s+/i, '')
    .replace(/^based\s+/i, '')
    .replace(/\(.*\)$/g, '')
    .replace(/\[.*\]$/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')

  // Stage 5: Apply mappings
  cleaned = applyMappings(cleaned)

  // Stage 6: Clean up extra whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s/&-]/g, '')
    .trim()

  // Stage 7: Title case for display name
  const words = cleaned.split(/\s+/)
  const titleCased = words
    .map(word => {
      if (
        /^[A-Z]{2,}$/.test(word) ||
        [
          'API',
          'CI',
          'CMS',
          'CSS',
          'DB',
          'GUI',
          'HR',
          'IDE',
          'iOS',
          'LLM',
          'ML',
          'OAuth',
          'ORM',
          'SDK',
          'SQL',
          'UI',
          'UX',
          'VS',
          'Web3',
        ].includes(word)
      ) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')

  // Stage 8: Pluralize for consistency
  const name = pluralize(titleCased)

  // Stage 9: Generate slug
  const slug = generateSlug(name)

  return {
    name,
    slug,
  }
}

/**
 * Apply category mappings to normalize to canonical form
 */
function applyMappings(name: string): string {
  const lower = name.toLowerCase().trim()

  if (CATEGORY_MAPPINGS[lower]) {
    return CATEGORY_MAPPINGS[lower]
  }

  for (const [canonical, synonyms] of Object.entries(SYNONYM_GROUPS)) {
    if (synonyms.some(s => lower.includes(s))) {
      return canonical
    }
  }

  return name
}
