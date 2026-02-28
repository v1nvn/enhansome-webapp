/**
 * Category utilities
 * Consolidates category normalization and matching
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
  'ui framework': 'UI Components',
  'ui frameworks': 'UI Components',
  'component library': 'UI Components',
  'component libraries': 'UI Components',

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
  'orm and datamapping': 'ORMs',

  // Tool categories
  tool: 'Tools',
  tools: 'Tools',
  'developer tool': 'Developer Tools',
  'developer tools': 'Developer Tools',
  devtools: 'Developer Tools',
  'system tools': 'Developer Tools',
  development: 'Developer Tools',
  'development tools': 'Developer Tools',
  'development environment': 'Developer Tools',
  'other tools and integrations': 'Developer Tools',
  cli: 'CLI Tools',
  'command line': 'CLI Tools',
  'command-line': 'CLI Tools',
  'command-line apps': 'CLI Tools',
  'command-line utilities': 'CLI Tools',

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
  utils: 'Utilities',
  'mixed utilities': 'Utilities',
  helper: 'Helpers',
  helpers: 'Helpers',
  lib: 'Libraries & Frameworks',
  library: 'Libraries & Frameworks',
  libraries: 'Libraries & Frameworks',
  frameworks: 'Libraries & Frameworks',
  'new libraries': 'Libraries & Frameworks',
  'framework components': 'Libraries & Frameworks',
  'frameworks/engines/libraries': 'Libraries & Frameworks',

  // Misc/Other/Generic
  miscellaneous: 'Miscellaneous',
  misc: 'Miscellaneous',
  other: 'Miscellaneous',
  others: 'Miscellaneous',
  general: 'Miscellaneous',

  // Data processing
  data: 'Data',
  validation: 'Validation',
  parser: 'Parsers',
  parsers: 'Parsers',
  formatter: 'Formatters',
  formatters: 'Formatters',
  'algorithms and data structures': 'Algorithms',
  'data analysis / data visualization': 'Data Visualization',
  'text and numbers': 'Text Processing',

  // HTTP/networking
  http: 'HTTP',
  'http clients': 'HTTP Clients',
  'http servers': 'HTTP Servers',
  'http server': 'HTTP Servers',
  networking: 'Networking',
  network: 'Networking',
  'network programming': 'Networking',
  websocket: 'WebSockets',
  fetch: 'Fetch',
  axios: 'HTTP Clients',
  request: 'HTTP Clients',

  // File handling
  file: 'File Handling',
  upload: 'File Upload',
  storage: 'Storage',
  'file transfer - single-click & drag-n-drop upload': 'File Management',

  // UI components
  ui: 'UI Components',
  gui: 'UI Components',
  'ui libraries': 'UI Components',
  components: 'UI Components',
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

  // Image/graphics
  image: 'Graphics & Images',
  images: 'Graphics & Images',
  img: 'Graphics & Images',
  'image processing': 'Graphics & Images',
  graphics: 'Graphics & Images',
  video: 'Video',
  audio: 'Audio',
  media: 'Media',
  'media streaming - audio streaming': 'Media',

  // AI/ML
  ai: 'Machine Learning',
  ml: 'Machine Learning',
  'machine learning': 'Machine Learning',
  'general-purpose machine learning': 'Machine Learning',
  'artificial intelligence': 'Machine Learning',
  'natural language processing': 'Machine Learning',
  'knowledge & memory': 'Machine Learning',
  'coding agents': 'Machine Learning',
  llm: 'LLMs',
  openai: 'OpenAI',
  chatgpt: 'ChatGPT',

  // Game development
  game: 'Games',
  games: 'Games',
  gaming: 'Games',
  arcade: 'Games',
  strategy: 'Games',
  fps: 'Games',
  rpg: 'Games',
  puzzle: 'Games',
  'game engine': 'Games',
  'godot 4': 'Games',
  'godot 3': 'Games',
  unity: 'Unity',
  unreal: 'Unreal',

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
  'capgo capacitor plugins': 'Mobile',

  // Desktop
  desktop: 'Desktop',
  electron: 'Electron',
  tauri: 'Tauri',

  // CMS
  cms: 'CMS',
  'headless cms': 'Headless CMS',
  'content management': 'CMS',
  'content management systems': 'CMS',

  // E-commerce
  ecommerce: 'E-commerce',
  'e-commerce': 'E-commerce',
  payment: 'Payments',
  payments: 'Payments',
  stripe: 'Stripe',

  // Finance
  'finance & fintech': 'Finance',
  'money, budgeting & management': 'Finance',

  // Blockchain
  blockchain: 'Blockchain',
  crypto: 'Cryptocurrency',
  web3: 'Web3',
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin',
  nft: 'NFTs',

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
  'editing support': 'Editor Plugins',

  // Cloud
  'cloud platforms': 'Cloud',

  // Search
  'search & data extraction': 'Search',

  // Automation
  'browser automation': 'Automation',

  // Productivity
  'workplace & productivity': 'Productivity',

  // Communication
  communication: 'Communication',
  'communication - custom communication systems': 'Communication',
  'communication - social networks and forums': 'Communication',

  // Web applications
  'open source rails apps': 'Web Applications',

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
  'third-party apis': 'APIs',
}

const SYNONYM_GROUPS: Record<string, string[]> = {
  'Developer Tools': ['devtools', 'tooling'],
  Testing: ['test', 'testing', 'spec'],
  'Build Tools': ['build', 'compile', 'bundle', 'transpile'],
  Styling: ['css', 'style', 'sass', 'less'],
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
  const { mapped: wasMapped, result: mappedResult } = applyMappings(cleaned)
  cleaned = mappedResult

  // Stage 6: Clean up extra whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s/&-]/g, '')
    .trim()

  // If a direct mapping was found, trust its casing — skip title case and pluralize
  if (wasMapped) {
    const slug = generateSlug(cleaned)
    return { name: cleaned, slug }
  }

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
function applyMappings(name: string): { mapped: boolean; result: string } {
  const lower = name.toLowerCase().trim()

  if (CATEGORY_MAPPINGS[lower]) {
    return { mapped: true, result: CATEGORY_MAPPINGS[lower] }
  }

  for (const [canonical, synonyms] of Object.entries(SYNONYM_GROUPS)) {
    if (synonyms.some(s => lower.includes(s))) {
      return { mapped: true, result: canonical }
    }
  }

  return { mapped: false, result: name }
}
